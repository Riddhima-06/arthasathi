import datetime as dt
import uuid
from decimal import Decimal

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer,
    Numeric, String, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

Money = Numeric(14, 2)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("caste_category IN ('SC','ST','OBC','General')", name="users_caste_chk"),
        CheckConstraint("role IN ('BENEFICIARY','FIELD_OFFICER','ADMIN')", name="users_role_chk"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name: Mapped[str] = mapped_column(String(150))
    mobile: Mapped[str] = mapped_column(String(15), unique=True)
    password_hash: Mapped[str] = mapped_column(String, server_default="")
    caste_category: Mapped[str] = mapped_column(String(10))
    annual_family_income: Mapped[Decimal] = mapped_column(Money)
    state: Mapped[str] = mapped_column(String(80))
    district: Mapped[str] = mapped_column(String(80))
    block: Mapped[str] = mapped_column(String(80))
    panchayat: Mapped[str | None] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(15), server_default="BENEFICIARY")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enterprises: Mapped[list["Enterprise"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Scheme(Base):
    __tablename__ = "schemes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scheme_name: Mapped[str] = mapped_column(String(120))
    scheme_code: Mapped[str] = mapped_column(String(20), unique=True)
    min_project_cost: Mapped[Decimal] = mapped_column(Money, server_default="0")
    max_project_cost: Mapped[Decimal] = mapped_column(Money)
    mandated_margin_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="10.00")
    loan_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="90.00")
    interest_rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    max_tenure_months: Mapped[int] = mapped_column(Integer)
    moratorium_months: Mapped[int] = mapped_column(Integer, server_default="0")


class Enterprise(Base):
    __tablename__ = "enterprises"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    business_title: Mapped[str] = mapped_column(String(200))
    business_category: Mapped[str] = mapped_column(String(80), index=True)
    available_margin_capital: Mapped[Decimal] = mapped_column(Money)
    estimated_total_cost: Mapped[Decimal] = mapped_column(Money)
    projected_monthly_revenue: Mapped[Decimal] = mapped_column(Money)
    projected_monthly_opex: Mapped[Decimal] = mapped_column(Money)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="enterprises")
    loans: Mapped[list["Loan"]] = relationship(back_populates="enterprise", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','DISBURSED','REJECTED')",
            name="loans_status_chk",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    enterprise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enterprises.id", ondelete="CASCADE"), index=True)
    scheme_id: Mapped[int] = mapped_column(ForeignKey("schemes.id"))
    sanctioned_amount: Mapped[Decimal] = mapped_column(Money)
    applied_interest_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    tenure_months: Mapped[int] = mapped_column(Integer)
    moratorium_months: Mapped[int] = mapped_column(Integer, server_default="0")
    monthly_emi: Mapped[Decimal | None] = mapped_column(Money)
    status: Mapped[str] = mapped_column(String(15), server_default="DRAFT", index=True)
    sanctioned_date: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enterprise: Mapped[Enterprise] = relationship(back_populates="loans")
    schedule: Mapped[list["AmortizationSchedule"]] = relationship(
        back_populates="loan", order_by="AmortizationSchedule.month_number", cascade="all, delete-orphan"
    )


class AmortizationSchedule(Base):
    __tablename__ = "amortization_schedules"
    __table_args__ = (
        UniqueConstraint("loan_id", "month_number"),
        CheckConstraint("payment_status IN ('PENDING','PAID','OVERDUE')", name="amort_status_chk"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    loan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"))
    month_number: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[dt.date] = mapped_column(Date)
    is_moratorium: Mapped[bool] = mapped_column(Boolean, server_default="false")
    opening_balance: Mapped[Decimal] = mapped_column(Money)
    emi_amount: Mapped[Decimal] = mapped_column(Money)
    principal_component: Mapped[Decimal] = mapped_column(Money)
    interest_component: Mapped[Decimal] = mapped_column(Money)
    closing_balance: Mapped[Decimal] = mapped_column(Money)
    payment_status: Mapped[str] = mapped_column(String(10), server_default="PENDING")

    loan: Mapped[Loan] = relationship(back_populates="schedule")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    table_name: Mapped[str] = mapped_column(String(63))
    record_id: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String(40))
    old_data: Mapped[dict | None] = mapped_column(JSONB)
    new_data: Mapped[dict | None] = mapped_column(JSONB)
    timestamp: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
