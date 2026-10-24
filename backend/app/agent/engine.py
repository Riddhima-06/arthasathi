"""Agent runner. Uses Gemini or Claude with the tool belt when a key is configured;
otherwise a deterministic offline advisor calls the same tools, so demos work without keys."""
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import tools as T
from app.config import settings
from app.models import Enterprise, User
from app.services.financial_engine import fmt_inr

SYSTEM_PROMPT = """You are ArthaSathi, a financial advisor for first-time entrepreneurs applying for concessional loans under Ministry of Social Justice and Empowerment schemes.

Rules:
- Use the tools for every number: scheme choice, EMI, DSCR, saturation. Never estimate figures yourself.
- Statutory structure: margin money is 10% of project cost and the loan is 90%. Micro Finance Scheme covers projects up to ₹1.40 lakh; Term Loan Scheme covers ₹1.40 lakh to ₹50 lakh.
- A DSCR below 1.25 is a risk. Use counterfactual_remediation_tool and explain the exact changes it returns.
- query_database_tool can only read the signed-in user's own enterprise, loan and schedule data (views v_my_enterprises, v_my_loans, v_my_schedule), v_block_density and schemes.
- You advise; you do not sanction loans. Say so if asked whether a loan will be approved.
- Write rupee amounts in Indian grouping (₹1,20,000). Reply in the language the user writes in. Keep answers short and concrete.
User context: {name}, {block} block, {district} district, {state}."""


def _llm():
    if settings.google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=settings.gemini_model, google_api_key=settings.google_api_key, temperature=0.2)
    if settings.anthropic_api_key:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=settings.agent_model, api_key=settings.anthropic_api_key, temperature=0.2, max_tokens=1000)
    return None


def _text(content: Any) -> str:
    if isinstance(content, str):
        return content
    return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)


def llm_available() -> bool:
    return bool(settings.google_api_key or settings.anthropic_api_key)


async def run_llm(message: str, user: User) -> str:
    from langgraph.prebuilt import create_react_agent
    agent = create_react_agent(
        _llm(), T.TOOLS,
        prompt=SYSTEM_PROMPT.format(name=user.full_name, block=user.block, district=user.district, state=user.state),
    )
    out = await agent.ainvoke({"messages": [("user", message)]}, config={"recursion_limit": 12})
    return _text(out["messages"][-1].content).strip() or "I couldn't work that out. Could you rephrase the question?"


# ---------------- offline advisor ----------------
_AMOUNT = re.compile(r"₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|l\b|k\b|thousand)?", re.I)


def _amount(message: str) -> float | None:
    for m in _AMOUNT.finditer(message):
        n = float(m.group(1).replace(",", ""))
        unit = (m.group(2) or "").lower()
        n *= 100000 if unit in ("lakh", "lac", "l") else 1000 if unit in ("k", "thousand") else 1
        if n >= 1000:
            return n
    return None


async def run_offline(message: str, user: User, db: AsyncSession) -> str:
    import json
    low = message.lower()
    ent = await db.scalar(select(Enterprise).where(Enterprise.user_id == user.id).order_by(Enterprise.created_at.desc()).limit(1))

    if any(w in low for w in ("crowd", "compet", "saturat", "density", "market")):
        category = ent.business_category if ent else "Tailoring"
        r = json.loads(await T.local_density_analyzer(user.district, user.block, category))
        return (f"In {user.block}, I count {r['competitor_count']} existing {category.lower()} enterprise(s) out of "
                f"{r['total_enterprises_in_block']} registered. Saturation is {r['saturation_level'].lower()}.")

    if any(w in low for w in ("dscr", "safe", "expense", "opex", "repay", "afford", "cost cut", "cut")):
        if ent is None:
            return "Add your enterprise's cost, revenue and expenses first, and I can check whether the loan is safe to carry."
        r = json.loads(await T.counterfactual_remediation(
            float(ent.available_margin_capital), float(ent.estimated_total_cost),
            float(ent.projected_monthly_revenue), float(ent.projected_monthly_opex)))
        head = f"For {ent.business_title}: DSCR {r.get('dscr')} with margin at {r.get('margin_ratio_pct')}% of cost."
        return head + (" " + " ".join(r["recommendations"]) if r.get("recommendations") else " That is within safe limits.")

    amt = _amount(message)
    if amt is not None or any(w in low for w in ("scheme", "margin", "eligible", "eligib")):
        amt = amt if amt is not None else (float(ent.available_margin_capital) if ent else None)
        if amt is None:
            return "Tell me how much margin money you can put in, for example “scheme for ₹15,000 margin”."
        r = json.loads(await T.evaluate_scheme(amt))
        if not r["eligible"]:
            return r["reason"]
        return (f"With {fmt_inr(r['margin_capital'])} margin, your project can be up to {fmt_inr(r['total_project_cost'])}. "
                f"That falls under the {r['scheme_name']}: a loan of {fmt_inr(r['loan_amount'])} at {r['interest_rate_pct']}% over "
                f"{r['tenure_months']} months, with {r['moratorium_months']} months of interest-only moratorium. "
                f"Your monthly instalment after that is about {fmt_inr(r['repayment_emi'])}.")

    return ("I can help with three things: which scheme fits a margin amount (“scheme for ₹12,000”), "
            "whether your plan can carry the loan (“is my DSCR safe?”), and how crowded your business type is in your block.")


async def chat(message: str, user: User, db: AsyncSession) -> tuple[str, list, str]:
    T.current_user_id.set(str(user.id))
    steps: list = []
    T.trace.set(steps)
    if llm_available():
        return await run_llm(message, user), steps, "llm"
    return await run_offline(message, user, db), steps, "offline"
