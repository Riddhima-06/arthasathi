-- 1) Margin-money guard: sanctioned amount may never exceed 90% of project cost.
CREATE OR REPLACE FUNCTION fn_validate_margin_ratio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cost NUMERIC;
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW.status = 'APPROVED'
       OR NEW.sanctioned_amount IS DISTINCT FROM OLD.sanctioned_amount THEN

        SELECT estimated_total_cost INTO v_cost FROM enterprises WHERE id = NEW.enterprise_id;
        IF v_cost IS NULL THEN
            RAISE EXCEPTION 'Enterprise % does not exist', NEW.enterprise_id;
        END IF;
        IF NEW.sanctioned_amount > ROUND(v_cost * 0.90, 2) THEN
            RAISE EXCEPTION
              'Sanctioned amount % exceeds 90%% of project cost % (max %). Minimum 10%% margin money is mandatory.',
              NEW.sanctioned_amount, v_cost, ROUND(v_cost * 0.90, 2)
              USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_margin_ratio
BEFORE INSERT OR UPDATE OF status, sanctioned_amount ON loans
FOR EACH ROW EXECUTE FUNCTION fn_validate_margin_ratio();

-- 2) Audit trail: record creation and every status transition with JSON snapshots.
CREATE OR REPLACE FUNCTION fn_loan_audit_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES ('loans', NEW.id::text, 'INSERT', NULL, to_jsonb(NEW));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES ('loans', NEW.id::text, 'STATUS_' || OLD.status || '_TO_' || NEW.status,
                to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loan_audit_logger
AFTER INSERT OR UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION fn_loan_audit_logger();
