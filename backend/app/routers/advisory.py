from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import User
from app.schemas import CounterfactualIn, SchemeIn
from app.services import counterfactual, financial_engine as fe

router = APIRouter(prefix="/advisory", tags=["advisory"])  # scheme + counterfactual maths are public; density needs sign-in


@router.post("/scheme")
async def match_scheme(body: SchemeIn):
    """Statutory structuring for a margin amount, plus the moratorium comparison."""
    result = fe.evaluate_margin(body.margin_capital)
    if not result["eligible"]:
        return result
    result["comparison"] = fe.moratorium_comparison(
        result["loan_amount"], result["interest_rate_pct"], result["tenure_months"], result["moratorium_months"]
    )
    return result


@router.post("/counterfactual")
async def counterfactual_analysis(body: CounterfactualIn):
    try:
        return counterfactual.analyze(body.margin, body.requested_cost, body.revenue, body.opex)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/density")
async def local_density(
    category: str = Query(min_length=2),
    district: str | None = None,
    block: str | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    district, block = district or user.district, block or user.block
    rows = (await db.execute(
        text("SELECT business_category, enterprise_count FROM v_block_density WHERE lower(district)=lower(:d) AND lower(block)=lower(:b)"),
        {"d": district, "b": block},
    )).mappings().all()
    total = sum(r["enterprise_count"] for r in rows)
    same = sum(r["enterprise_count"] for r in rows if r["business_category"].lower() == category.lower())
    return {
        "district": district, "block": block, "category": category,
        "competitor_count": same, "total_enterprises_in_block": total,
        "saturation_level": "LOW" if same < 3 else "MODERATE" if same < 8 else "HIGH",
    }
