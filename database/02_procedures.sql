-- Rebuilds the full installment schedule for one loan, atomically.
-- Call with: SELECT generate_amortization_schedule('<loan uuid>');
CREATE OR REPLACE FUNCTION generate_amortization_schedule(p_loan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_principal NUMERIC; v_rate NUMERIC; v_tenure INT; v_mor INT; v_start DATE;
    r NUMERIC; n INT; v_emi NUMERIC; bal NUMERIC;
    i INT; open_bal NUMERIC; int_c NUMERIC; prin_c NUMERIC; pay NUMERIC;
BEGIN
    SELECT sanctioned_amount, applied_interest_rate, tenure_months, moratorium_months,
           COALESCE(sanctioned_date, CURRENT_DATE)
      INTO v_principal, v_rate, v_tenure, v_mor, v_start
      FROM loans WHERE id = p_loan_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan % not found', p_loan_id USING ERRCODE = 'no_data_found';
    END IF;
    IF v_mor >= v_tenure THEN
        RAISE EXCEPTION 'Moratorium (%) must be shorter than tenure (%)', v_mor, v_tenure;
    END IF;

    DELETE FROM amortization_schedules WHERE loan_id = p_loan_id;

    r := v_rate / 12 / 100;
    n := v_tenure - v_mor;
    bal := v_principal;

    IF r = 0 THEN
        v_emi := ROUND(bal / n, 2);
    ELSE
        v_emi := ROUND(bal * (r * POWER(1 + r, n)) / (POWER(1 + r, n) - 1), 2);
    END IF;

    FOR i IN 1..v_tenure LOOP
        open_bal := bal;
        int_c := ROUND(bal * r, 2);

        IF i <= v_mor THEN
            -- Moratorium: interest-only servicing, principal untouched
            INSERT INTO amortization_schedules
                (loan_id, month_number, due_date, is_moratorium, opening_balance,
                 emi_amount, principal_component, interest_component, closing_balance)
            VALUES (p_loan_id, i, (v_start + make_interval(months => i))::date, TRUE, open_bal,
                    int_c, 0.00, int_c, open_bal);
        ELSE
            IF i = v_tenure THEN
                -- Final installment absorbs accumulated rounding so the balance closes at zero
                prin_c := bal;
                pay := prin_c + int_c;
            ELSE
                prin_c := v_emi - int_c;
                pay := v_emi;
            END IF;
            bal := bal - prin_c;
            INSERT INTO amortization_schedules
                (loan_id, month_number, due_date, is_moratorium, opening_balance,
                 emi_amount, principal_component, interest_component, closing_balance)
            VALUES (p_loan_id, i, (v_start + make_interval(months => i))::date, FALSE, open_bal,
                    pay, prin_c, int_c, bal);
        END IF;
    END LOOP;

    UPDATE loans SET monthly_emi = v_emi WHERE id = p_loan_id;
    RETURN v_tenure;
END;
$$;
