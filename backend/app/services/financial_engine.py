"""Deterministic lending maths. All money is Decimal, rounded half-up to paise,
mirroring the PL/pgSQL generate_amortization_schedule procedure."""
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

PAISE = Decimal("0.01")
MARGIN_PCT = Decimal("0.10")
LOAN_PCT = Decimal("0.90")
MICRO_CAP = Decimal("140000")
TERM_CAP = Decimal("5000000")
SAFE_DSCR = Decimal("1.30")
MIN_DSCR = Decimal("1.25")


@dataclass(frozen=True)
class SchemeTerms:
    code: str
    name: str
    rate_pct: Decimal
    tenure_months: int
    moratorium_months: int

    @property
    def repayment_months(self) -> int:
        return self.tenure_months - self.moratorium_months


MICRO = SchemeTerms("MFS", "Micro Finance Scheme", Decimal("6.5"), 36, 3)
TERM = SchemeTerms("TLS", "Term Loan Scheme", Decimal("8.0"), 84, 6)


def D(x) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(str(x))


def q(x) -> Decimal:
    return D(x).quantize(PAISE, rounding=ROUND_HALF_UP)


def fmt_inr(x) -> str:
    """12,34,567 style grouping with the rupee sign."""
    n = int(q(x).to_integral_value(rounding=ROUND_HALF_UP))
    sign, s = ("-" if n < 0 else ""), str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return f"{sign}₹{s}"


def scheme_for_cost(total_cost) -> Optional[SchemeTerms]:
    c = D(total_cost)
    if c <= 0 or c > TERM_CAP:
        return None
    return MICRO if c <= MICRO_CAP else TERM


def monthly_rate(annual_pct) -> Decimal:
    return D(annual_pct) / Decimal(12) / Decimal(100)


def emi(principal, annual_pct, months: int) -> Decimal:
    p, r = D(principal), monthly_rate(annual_pct)
    if months <= 0:
        raise ValueError("months must be positive")
    if r == 0:
        return q(p / months)
    f = (1 + r) ** months
    return q(p * (r * f) / (f - 1))


def principal_for_emi(max_emi, annual_pct, months: int) -> Decimal:
    """Present value of an annuity: the largest loan a given EMI can service."""
    e, r = D(max_emi), monthly_rate(annual_pct)
    if r == 0:
        return q(e * months)
    f = (1 + r) ** months
    return q(e * (f - 1) / (r * f))


def build_schedule(principal, annual_pct, tenure: int, moratorium: int, start: Optional[date] = None) -> list[dict]:
    if moratorium >= tenure:
        raise ValueError("moratorium must be shorter than tenure")
    start = start or date.today()
    p, r = D(principal), monthly_rate(annual_pct)
    n = tenure - moratorium
    pay = emi(p, annual_pct, n)
    bal, rows = p, []
    for i in range(1, tenure + 1):
        opening, interest = bal, q(bal * r)
        if i <= moratorium:
            principal_c, amount = Decimal("0.00"), interest
        elif i == tenure:
            principal_c = bal
            amount = principal_c + interest
        else:
            principal_c, amount = pay - interest, pay
        bal = bal - principal_c
        y, m = divmod(start.month - 1 + i, 12)
        due = date(start.year + y, m + 1, min(start.day, 28))
        rows.append({
            "month_number": i, "due_date": due, "is_moratorium": i <= moratorium,
            "opening_balance": opening, "emi_amount": amount,
            "principal_component": principal_c, "interest_component": interest,
            "closing_balance": bal, "payment_status": "PENDING",
        })
    return rows


def dscr(monthly_revenue, monthly_opex, prospective_emi) -> Decimal:
    e = D(prospective_emi)
    if e <= 0:
        return Decimal("999")
    return (D(monthly_revenue) - D(monthly_opex)) / e


def evaluate_margin(margin_capital) -> dict:
    """Statutory structuring: margin is 10% of cost, loan is the other 90%."""
    m = D(margin_capital)
    total = q(m / MARGIN_PCT)
    scheme = scheme_for_cost(total)
    if scheme is None:
        return {"eligible": False, "total_project_cost": float(total),
                "reason": f"Implied project cost {fmt_inr(total)} is outside the {fmt_inr(TERM_CAP)} scheme ceiling."}
    loan = q(total * LOAN_PCT)
    return {
        "eligible": True,
        "scheme_code": scheme.code, "scheme_name": scheme.name,
        "margin_capital": float(m), "total_project_cost": float(total), "loan_amount": float(loan),
        "interest_rate_pct": float(scheme.rate_pct), "tenure_months": scheme.tenure_months,
        "moratorium_months": scheme.moratorium_months,
        "repayment_emi": float(emi(loan, scheme.rate_pct, scheme.repayment_months)),
    }


def moratorium_comparison(principal, annual_pct, tenure: int, moratorium: int) -> dict:
    """Side-by-side: with the scheme moratorium vs repaying from month 1."""
    def summarise(mor: int) -> dict:
        rows = build_schedule(principal, annual_pct, tenure, mor)
        interest = sum(r["interest_component"] for r in rows)
        return {
            "moratorium_months": mor,
            "first_repayment_emi": float(next(r["emi_amount"] for r in rows if not r["is_moratorium"])),
            "total_interest": float(interest),
            "total_outflow": float(sum(r["emi_amount"] for r in rows)),
        }
    with_m, without_m = summarise(moratorium), summarise(0)
    return {
        "with_moratorium": with_m,
        "without_moratorium": without_m,
        "extra_interest_cost": round(with_m["total_interest"] - without_m["total_interest"], 2),
    }
