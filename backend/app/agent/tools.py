"""Tool belt for the ArthaSathi agent. Every tool returns a JSON string and
appends a record to the per-request trace, which the UI shows in its audit panel."""
import json
import re
from contextvars import ContextVar

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.services import counterfactual, financial_engine

current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")
trace: ContextVar[list] = ContextVar("agent_trace")

ALLOWED_RELATIONS = {"v_my_enterprises", "v_my_loans", "v_my_schedule", "v_block_density", "schemes"}
_FORBIDDEN = re.compile(
    r"(;|--|/\*|\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|"
    r"vacuum|set|reset|listen|notify|lock|pg_sleep|pg_read_file|lo_import|lo_export|dblink)\b)",
    re.IGNORECASE,
)
_RELATION = re.compile(r"\b(?:from|join)\s+([\w\.\"]+)", re.IGNORECASE)
_CTE = re.compile(r"\b(\w+)\s+as\s*\(", re.IGNORECASE)


def _record(tool: str, args: dict, output) -> str:
    out = output if isinstance(output, str) else json.dumps(output, default=str)
    try:
        trace.get().append({"tool": tool, "args": args, "output": out[:1500]})
    except LookupError:
        pass
    return out


def validate_sql(sql: str) -> str | None:
    """Return an error message if the query is not a safe single read-only SELECT."""
    s = sql.strip()
    if not re.match(r"^(select|with)\b", s, re.IGNORECASE):
        return "Only SELECT queries are allowed."
    if _FORBIDDEN.search(s):
        return "Query contains a forbidden keyword or multi-statement syntax."
    ctes = {c.lower() for c in _CTE.findall(s)}
    for rel in _RELATION.findall(s):
        name = rel.strip('"').split(".")[-1].lower()
        if name not in ALLOWED_RELATIONS and name not in ctes:
            return f"Relation '{name}' is not queryable. Allowed: {', '.join(sorted(ALLOWED_RELATIONS))}."
    return None


async def query_database(sql_query: str) -> str:
    err = validate_sql(sql_query)
    if err:
        return _record("query_database_tool", {"sql_query": sql_query}, {"error": err})
    uid = current_user_id.get()
    if not uid:
        return _record("query_database_tool", {"sql_query": sql_query}, {"error": "No authenticated user."})
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(text("SET TRANSACTION READ ONLY"))
            await session.execute(text("SET LOCAL statement_timeout = '3s'"))
            # Row isolation: the v_my_* views read this setting, so users only see their own data.
            await session.execute(text("SELECT set_config('app.user_id', :u, true)"), {"u": uid})
            result = await session.execute(text(f"SELECT * FROM ({sql_query}) AS q LIMIT 200"))
            rows = [dict(r) for r in result.mappings().all()]
    return _record("query_database_tool", {"sql_query": sql_query}, {"row_count": len(rows), "rows": rows})


async def evaluate_scheme(margin_capital: float) -> str:
    return _record("evaluate_scheme_tool", {"margin_capital": margin_capital},
                   financial_engine.evaluate_margin(margin_capital))


async def local_density_analyzer(district: str, block: str, category: str) -> str:
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(
            text("""SELECT business_category, enterprise_count FROM v_block_density
                    WHERE lower(district) = lower(:d) AND lower(block) = lower(:b)"""),
            {"d": district, "b": block},
        )).mappings().all()
    total = sum(r["enterprise_count"] for r in rows)
    same = sum(r["enterprise_count"] for r in rows if r["business_category"].lower() == category.lower())
    share = round(same / total * 100, 1) if total else 0.0
    level = "LOW" if same < 3 else "MODERATE" if same < 8 else "HIGH"
    return _record("local_density_analyzer_tool", {"district": district, "block": block, "category": category}, {
        "competitor_count": same, "total_enterprises_in_block": total,
        "category_share_pct": share, "saturation_level": level,
        "categories_in_block": {r["business_category"]: r["enterprise_count"] for r in rows},
    })


async def counterfactual_remediation(margin: float, requested_cost: float, revenue: float, opex: float) -> str:
    args = {"margin": margin, "requested_cost": requested_cost, "revenue": revenue, "opex": opex}
    return _record("counterfactual_remediation_tool", args, counterfactual.analyze(margin, requested_cost, revenue, opex))


class _SQL(BaseModel):
    sql_query: str = Field(description="One read-only SELECT over v_my_enterprises, v_my_loans, v_my_schedule, v_block_density or schemes.")

class _Margin(BaseModel):
    margin_capital: float = Field(description="Rupees the entrepreneur can contribute as margin money.")

class _Density(BaseModel):
    district: str
    block: str
    category: str = Field(description="Business category, e.g. Tailoring, Dairy, Poultry.")

class _Counterfactual(BaseModel):
    margin: float
    requested_cost: float
    revenue: float = Field(description="Projected monthly revenue in rupees.")
    opex: float = Field(description="Projected monthly operating expense in rupees.")


TOOLS = [
    StructuredTool.from_function(coroutine=query_database, name="query_database_tool", args_schema=_SQL,
        description="Run a strict read-only SQL query scoped to the signed-in user's own data."),
    StructuredTool.from_function(coroutine=evaluate_scheme, name="evaluate_scheme_tool", args_schema=_Margin,
        description="Given margin capital, derive total project cost (margin/0.10), pick Micro Finance or Term Loan scheme, and return rate, loan amount and EMI."),
    StructuredTool.from_function(coroutine=local_density_analyzer, name="local_density_analyzer_tool", args_schema=_Density,
        description="Count competing enterprises of a category in a block and rate market saturation."),
    StructuredTool.from_function(coroutine=counterfactual_remediation, name="counterfactual_remediation_tool", args_schema=_Counterfactual,
        description="Compute DSCR and, if below 1.25 or margin below 10%, return the exact changes needed."),
]
