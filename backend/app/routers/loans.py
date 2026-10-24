import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import current_user, officer_user
from app.models import AmortizationSchedule, AuditLog, Enterprise, Loan, Scheme, User
from app.schemas import (
    AuditOut, DashboardOut, DecisionIn, EnterpriseIn, EnterpriseOut, LoanCreateIn, LoanOut, ScheduleRowOut,
)
from app.services import financial_engine as fe

router = APIRouter(tags=["loans"])

# action -> (statuses it may start from, resulting status)
TRANSITIONS = {
    "review": ({"SUBMITTED"}, "UNDER_REVIEW"),
    "approve": ({"SUBMITTED", "UNDER_REVIEW"}, "APPROVED"),
    "reject": ({"SUBMITTED", "UNDER_REVIEW"}, "REJECTED"),
    "disburse": ({"APPROVED"}, "DISBURSED"),
}


def _loan_scope(stmt, user: User):
    """Beneficiaries see their own loans; officers see their district; admins see all."""
    stmt = stmt.join(Enterprise, Enterprise.id == Loan.enterprise_id)
    if user.role == "BENEFICIARY":
        return stmt.where(Enterprise.user_id == user.id)
    if user.role == "FIELD_OFFICER":
        return stmt.join(User, User.id == Enterprise.user_id).where(User.district == user.district)
    return stmt


async def _get_loan(db: AsyncSession, loan_id: uuid.UUID, user: User) -> Loan:
    loan = await db.scalar(_loan_scope(select(Loan), user).where(Loan.id == loan_id))
    if loan is None:
        raise HTTPException(404, "Loan not found.")
    return loan


# ---------- enterprises ----------
@router.get("/enterprises", response_model=list[EnterpriseOut])
async def list_enterprises(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Enterprise).where(Enterprise.user_id == user.id).order_by(Enterprise.created_at.desc()))
    return list(rows)


@router.post("/enterprises", response_model=EnterpriseOut, status_code=201)
async def create_enterprise(body: EnterpriseIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    ent = Enterprise(user_id=user.id, **body.model_dump())
    db.add(ent)
    await db.flush()
    await db.refresh(ent)
    return ent


# ---------- loans ----------
@router.get("/loans", response_model=list[LoanOut])
async def list_loans(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(_loan_scope(select(Loan), user).order_by(Loan.created_at.desc()))
    return list(rows)


@router.post("/loans", response_model=LoanOut, status_code=201)
async def create_loan(body: LoanCreateIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    ent = await db.scalar(select(Enterprise).where(Enterprise.id == body.enterprise_id, Enterprise.user_id == user.id))
    if ent is None:
        raise HTTPException(404, "Enterprise not found.")
    terms = fe.scheme_for_cost(ent.estimated_total_cost)
    if terms is None:
        raise HTTPException(422, "Project cost is outside the supported range (up to ₹50,00,000).")
    # Loan finances what margin money doesn't, capped at the 90% statutory limit.
    amount = fe.q(max(Decimal(0), min(ent.estimated_total_cost * fe.LOAN_PCT, ent.estimated_total_cost - ent.available_margin_capital)))
    if amount <= 0:
        raise HTTPException(422, "Margin money already covers the full project cost; no loan is needed.")
    scheme = await db.scalar(select(Scheme).where(Scheme.scheme_code == terms.code))
    loan = Loan(
        enterprise_id=ent.id, scheme_id=scheme.id, sanctioned_amount=amount,
        applied_interest_rate=scheme.interest_rate_pct, tenure_months=scheme.max_tenure_months,
        moratorium_months=scheme.moratorium_months, status="DRAFT",
    )
    db.add(loan)
    await db.flush()   # DB trigger validates the 90% ceiling here
    await db.refresh(loan)
    return loan


@router.post("/loans/{loan_id}/submit", response_model=LoanOut)
async def submit_loan(loan_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    loan = await _get_loan(db, loan_id, user)
    if loan.status != "DRAFT":
        raise HTTPException(409, f"Only draft applications can be submitted (this one is {loan.status.lower()}).")
    loan.status = "SUBMITTED"
    await db.flush()
    return loan


@router.post("/loans/{loan_id}/decision", response_model=LoanOut)
async def decide_loan(loan_id: uuid.UUID, body: DecisionIn, user: User = Depends(officer_user), db: AsyncSession = Depends(get_db)):
    loan = await _get_loan(db, loan_id, user)
    allowed_from, new_status = TRANSITIONS[body.action]
    if loan.status not in allowed_from:
        raise HTTPException(409, f"Cannot {body.action} a loan that is {loan.status.lower()}.")
    loan.status = new_status
    if new_status == "APPROVED":
        loan.sanctioned_date = date.today()
    await db.flush()   # margin + audit triggers fire here
    if new_status == "APPROVED":
        # Approval hook: build the instalment schedule inside the same transaction.
        await db.execute(text("SELECT generate_amortization_schedule(CAST(:id AS uuid))"), {"id": str(loan.id)})
    await db.refresh(loan)
    return loan


@router.get("/loans/{loan_id}/schedule", response_model=list[ScheduleRowOut])
async def loan_schedule(loan_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    loan = await _get_loan(db, loan_id, user)
    rows = await db.scalars(select(AmortizationSchedule).where(AmortizationSchedule.loan_id == loan.id).order_by(AmortizationSchedule.month_number))
    return list(rows)


@router.patch("/loans/{loan_id}/schedule/{month}/pay", response_model=ScheduleRowOut)
async def mark_paid(loan_id: uuid.UUID, month: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    loan = await _get_loan(db, loan_id, user)
    if loan.status not in ("APPROVED", "DISBURSED"):
        raise HTTPException(409, "Payments can only be recorded on approved or disbursed loans.")
    row = await db.scalar(select(AmortizationSchedule).where(AmortizationSchedule.loan_id == loan.id, AmortizationSchedule.month_number == month))
    if row is None:
        raise HTTPException(404, "No such instalment.")
    row.payment_status = "PAID"
    await db.flush()
    return row


@router.get("/loans/{loan_id}/audit", response_model=list[AuditOut])
async def loan_audit(loan_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    loan = await _get_loan(db, loan_id, user)
    rows = await db.scalars(select(AuditLog).where(AuditLog.table_name == "loans", AuditLog.record_id == str(loan.id)).order_by(AuditLog.id))
    return list(rows)


# ---------- dashboard ----------
@router.get("/dashboard", response_model=DashboardOut, tags=["dashboard"])
async def dashboard(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    ent_loan = (await db.execute(
        select(Enterprise, Loan).join(Loan, Loan.enterprise_id == Enterprise.id)
        .where(Enterprise.user_id == user.id)
        .options(selectinload(Loan.schedule))
        .order_by((Loan.status.in_(("APPROVED", "DISBURSED"))).desc(), Loan.created_at.desc()).limit(1)
    )).first()
    if ent_loan is None:
        ent = await db.scalar(select(Enterprise).where(Enterprise.user_id == user.id).order_by(Enterprise.created_at.desc()).limit(1))
        return DashboardOut(enterprise=ent)

    ent, loan = ent_loan
    schedule = list(loan.schedule)
    noi = ent.projected_monthly_revenue - ent.projected_monthly_opex
    repayment_emi = next((r.emi_amount for r in schedule if not r.is_moratorium), loan.monthly_emi)
    d = float(fe.dscr(ent.projected_monthly_revenue, ent.projected_monthly_opex, repayment_emi)) if repayment_emi else None
    paid = [r for r in schedule if r.payment_status == "PAID"]
    repaid = sum((r.principal_component for r in paid), Decimal(0))
    return DashboardOut(
        enterprise=ent, loan=loan, schedule=schedule,
        dscr=round(d, 2) if d is not None else None,
        dscr_status=None if d is None else "SAFE" if d >= 1.30 else "WATCH" if d >= 1.25 else "AT_RISK",
        progress={
            "paid_months": len(paid), "total_months": loan.tenure_months,
            "principal_repaid": float(repaid), "outstanding": float(loan.sanctioned_amount - repaid),
            "net_operating_income": float(noi), "repayment_emi": float(repayment_emi or 0),
        },
    )
