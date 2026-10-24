import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Money is stored as NUMERIC; the UI wants plain JSON numbers.
Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]
Caste = Literal["SC", "ST", "OBC", "General"]
Mobile = Annotated[str, Field(pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth ----
class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    mobile: Mobile
    password: str = Field(min_length=8, max_length=72)
    caste_category: Caste
    annual_family_income: Annotated[Decimal, Field(ge=0)]
    state: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)
    block: str = Field(min_length=2, max_length=80)
    panchayat: Optional[str] = Field(default=None, max_length=80)


class LoginIn(BaseModel):
    mobile: str
    password: str


class UserOut(ORM):
    id: uuid.UUID
    full_name: str
    mobile: str
    caste_category: str
    state: str
    district: str
    block: str
    panchayat: Optional[str]
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- advisory ----
class SchemeIn(BaseModel):
    margin_capital: Annotated[float, Field(gt=0, le=500000)]


class CounterfactualIn(BaseModel):
    margin: Annotated[float, Field(ge=0)]
    requested_cost: Annotated[float, Field(gt=0)]
    revenue: Annotated[float, Field(ge=0)]
    opex: Annotated[float, Field(ge=0)]


# ---- enterprises / loans ----
class EnterpriseIn(BaseModel):
    business_title: str = Field(min_length=2, max_length=200)
    business_category: str = Field(min_length=2, max_length=80)
    available_margin_capital: Annotated[Decimal, Field(ge=0)]
    estimated_total_cost: Annotated[Decimal, Field(gt=0)]
    projected_monthly_revenue: Annotated[Decimal, Field(ge=0)]
    projected_monthly_opex: Annotated[Decimal, Field(ge=0)]


class EnterpriseOut(ORM):
    id: uuid.UUID
    business_title: str
    business_category: str
    available_margin_capital: Money
    estimated_total_cost: Money
    projected_monthly_revenue: Money
    projected_monthly_opex: Money


class LoanCreateIn(BaseModel):
    enterprise_id: uuid.UUID


class LoanOut(ORM):
    id: uuid.UUID
    enterprise_id: uuid.UUID
    scheme_id: int
    sanctioned_amount: Money
    applied_interest_rate: Money
    tenure_months: int
    moratorium_months: int
    monthly_emi: Optional[Money]
    status: str
    sanctioned_date: Optional[dt.date]


class DecisionIn(BaseModel):
    action: Literal["review", "approve", "reject", "disburse"]


class ScheduleRowOut(ORM):
    month_number: int
    due_date: dt.date
    is_moratorium: bool
    opening_balance: Money
    emi_amount: Money
    principal_component: Money
    interest_component: Money
    closing_balance: Money
    payment_status: str


class AuditOut(ORM):
    action: str
    old_data: Optional[dict[str, Any]]
    new_data: Optional[dict[str, Any]]
    timestamp: dt.datetime


class DashboardOut(BaseModel):
    enterprise: Optional[EnterpriseOut] = None
    loan: Optional[LoanOut] = None
    schedule: list[ScheduleRowOut] = []
    dscr: Optional[float] = None
    dscr_status: Optional[Literal["SAFE", "WATCH", "AT_RISK"]] = None
    progress: Optional[dict[str, Any]] = None


# ---- agent ----
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatOut(BaseModel):
    reply: str
    trace: list[dict[str, Any]]
    mode: Literal["llm", "offline"]
