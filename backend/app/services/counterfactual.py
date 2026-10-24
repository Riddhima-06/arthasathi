"""Explainable counterfactual engine: when a plan fails the DSCR or margin test,
compute the smallest concrete changes that would make it pass."""
from decimal import Decimal

from app.services.financial_engine import (
    D, LOAN_PCT, MARGIN_PCT, MIN_DSCR, SAFE_DSCR, emi, fmt_inr, principal_for_emi, q, scheme_for_cost,
)


def _loan_for(cost: Decimal, margin: Decimal) -> Decimal:
    # Loan funds whatever the margin does not, capped at the 90% statutory limit.
    return max(Decimal(0), min(cost * LOAN_PCT, cost - margin))


def _alternative_size(margin: Decimal, noi: Decimal, start_cost: Decimal):
    """Largest project the current capital AND the cash flow can both carry."""
    if noi <= 0 or margin <= 0:
        return None, None
    cost = min(start_cost, margin / MARGIN_PCT)
    for _ in range(8):  # scheme can change as size shrinks, so iterate to a fixed point
        scheme = scheme_for_cost(cost)
        if scheme is None:
            cost = Decimal("5000000")
            continue
        max_loan = principal_for_emi(noi / SAFE_DSCR, scheme.rate_pct, scheme.repayment_months)
        new_cost = min(margin / MARGIN_PCT, margin + max_loan)
        if abs(new_cost - cost) < 1:
            cost = new_cost
            break
        cost = new_cost
    scheme = scheme_for_cost(cost)
    return (q(cost), scheme) if scheme else (None, None)


def analyze(margin: float, requested_cost: float, revenue: float, opex: float) -> dict:
    m, cost, rev, ox = D(margin), D(requested_cost), D(revenue), D(opex)
    if cost <= 0:
        raise ValueError("requested_cost must be positive")
    scheme = scheme_for_cost(cost)
    if scheme is None:
        return {"viable": False, "message": f"{fmt_inr(cost)} is outside the supported project cost range (up to ₹50,00,000)."}

    noi = rev - ox
    margin_ratio = m / cost
    loan = _loan_for(cost, m)
    prospective_emi = emi(loan, scheme.rate_pct, scheme.repayment_months)
    dscr_now = noi / prospective_emi if prospective_emi > 0 else Decimal("999")

    margin_ok = margin_ratio >= MARGIN_PCT
    dscr_ok = dscr_now >= MIN_DSCR
    result = {
        "viable": margin_ok and dscr_ok,
        "scheme_code": scheme.code,
        "loan_amount": float(q(loan)),
        "prospective_emi": float(prospective_emi),
        "net_operating_income": float(q(noi)),
        "dscr": round(float(dscr_now), 2),
        "margin_ratio_pct": round(float(margin_ratio * 100), 2),
        "checks": {"margin_at_least_10pct": margin_ok, "dscr_at_least_1_25": dscr_ok},
        "recommendations": [],
    }
    if result["viable"]:
        result["message"] = f"Plan passes: DSCR {result['dscr']} and margin {result['margin_ratio_pct']}%."
        return result

    recs = result["recommendations"]
    if not margin_ok:
        extra = q(cost * MARGIN_PCT - m)
        recs.append(f"Required additional margin deposit: {fmt_inr(extra)}")
        result["required_additional_margin"] = float(extra)
    if not dscr_ok:
        ceiling = rev - SAFE_DSCR * prospective_emi
        result["target_opex_ceiling"] = float(q(max(ceiling, Decimal(0))))
        if ceiling > 0:
            recs.append(f"Target monthly opex ceiling: {fmt_inr(ceiling)} to attain safe 1.30 DSCR")
        else:
            recs.append("Opex cuts alone cannot reach a safe 1.30 DSCR; revenue or project size must change.")
    alt_cost, alt_scheme = _alternative_size(m, noi, cost)
    if alt_cost is not None and alt_cost < cost:
        result["alternative_project_cost"] = float(alt_cost)
        recs.append(f"Alternative viable project sizing: {fmt_inr(alt_cost)} with current capital")
    elif alt_cost is None:
        recs.append("No project size is serviceable at current net operating income; revisit revenue assumptions.")
    result["message"] = " | ".join(recs)
    return result
