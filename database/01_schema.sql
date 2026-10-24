-- ArthaSathi core schema (PostgreSQL 15+)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    caste_category VARCHAR(10) NOT NULL CHECK (caste_category IN ('SC','ST','OBC','General')),
    annual_family_income NUMERIC(14,2) NOT NULL CHECK (annual_family_income >= 0),
    state VARCHAR(80) NOT NULL,
    district VARCHAR(80) NOT NULL,
    block VARCHAR(80) NOT NULL,
    panchayat VARCHAR(80),
    role VARCHAR(15) NOT NULL DEFAULT 'BENEFICIARY' CHECK (role IN ('BENEFICIARY','FIELD_OFFICER','ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_location ON users (state, district, block);

CREATE TABLE schemes (
    id SERIAL PRIMARY KEY,
    scheme_name VARCHAR(120) NOT NULL,
    scheme_code VARCHAR(20) NOT NULL UNIQUE,
    min_project_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    max_project_cost NUMERIC(14,2) NOT NULL,
    mandated_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    loan_pct NUMERIC(5,2) NOT NULL DEFAULT 90.00,
    interest_rate_pct NUMERIC(5,2) NOT NULL CHECK (interest_rate_pct >= 0),
    max_tenure_months INT NOT NULL CHECK (max_tenure_months > 0),
    moratorium_months INT NOT NULL DEFAULT 0 CHECK (moratorium_months >= 0),
    CHECK (mandated_margin_pct + loan_pct = 100),
    CHECK (min_project_cost <= max_project_cost),
    CHECK (moratorium_months < max_tenure_months)
);

CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_title VARCHAR(200) NOT NULL,
    business_category VARCHAR(80) NOT NULL,
    available_margin_capital NUMERIC(14,2) NOT NULL CHECK (available_margin_capital >= 0),
    estimated_total_cost NUMERIC(14,2) NOT NULL CHECK (estimated_total_cost > 0),
    projected_monthly_revenue NUMERIC(14,2) NOT NULL CHECK (projected_monthly_revenue >= 0),
    projected_monthly_opex NUMERIC(14,2) NOT NULL CHECK (projected_monthly_opex >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enterprises_user ON enterprises (user_id);
CREATE INDEX idx_enterprises_category ON enterprises (business_category);

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    scheme_id INT NOT NULL REFERENCES schemes(id),
    sanctioned_amount NUMERIC(14,2) NOT NULL CHECK (sanctioned_amount > 0),
    applied_interest_rate NUMERIC(5,2) NOT NULL CHECK (applied_interest_rate >= 0),
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    moratorium_months INT NOT NULL DEFAULT 0 CHECK (moratorium_months >= 0),
    monthly_emi NUMERIC(14,2),
    status VARCHAR(15) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','DISBURSED','REJECTED')),
    sanctioned_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (moratorium_months < tenure_months)
);
CREATE INDEX idx_loans_enterprise ON loans (enterprise_id);
CREATE INDEX idx_loans_status ON loans (status);

CREATE TABLE amortization_schedules (
    id BIGSERIAL PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    month_number INT NOT NULL CHECK (month_number > 0),
    due_date DATE NOT NULL,
    is_moratorium BOOLEAN NOT NULL DEFAULT FALSE,
    opening_balance NUMERIC(14,2) NOT NULL,
    emi_amount NUMERIC(14,2) NOT NULL,
    principal_component NUMERIC(14,2) NOT NULL,
    interest_component NUMERIC(14,2) NOT NULL,
    closing_balance NUMERIC(14,2) NOT NULL,
    payment_status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID','OVERDUE')),
    UNIQUE (loan_id, month_number)
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(63) NOT NULL,
    record_id TEXT NOT NULL,
    action VARCHAR(40) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_record ON audit_logs (table_name, record_id, timestamp DESC);

-- Row-scoped views used by the AI agent's read-only SQL tool.
-- The caller sets `app.user_id` per transaction; views filter on it.
CREATE VIEW v_my_enterprises AS
    SELECT e.* FROM enterprises e
    WHERE e.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid;

CREATE VIEW v_my_loans AS
    SELECT l.* FROM loans l
    JOIN enterprises e ON e.id = l.enterprise_id
    WHERE e.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid;

CREATE VIEW v_my_schedule AS
    SELECT s.* FROM amortization_schedules s
    JOIN loans l ON l.id = s.loan_id
    JOIN enterprises e ON e.id = l.enterprise_id
    WHERE e.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid;

-- Aggregate-only view: no individual PII leaves it.
CREATE VIEW v_block_density AS
    SELECT u.state, u.district, u.block, e.business_category, COUNT(*)::int AS enterprise_count
    FROM enterprises e JOIN users u ON u.id = e.user_id
    GROUP BY u.state, u.district, u.block, e.business_category;
