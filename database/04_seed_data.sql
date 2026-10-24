INSERT INTO schemes (scheme_name, scheme_code, min_project_cost, max_project_cost, interest_rate_pct, max_tenure_months, moratorium_months) VALUES
 ('Micro Finance Scheme', 'MFS', 0, 140000, 6.50, 36, 3),
 ('Term Loan Scheme',     'TLS', 140000.01, 5000000, 8.00, 84, 6)
ON CONFLICT (scheme_code) DO NOTHING;

INSERT INTO users (id, full_name, mobile, caste_category, annual_family_income, state, district, block, panchayat) VALUES
 ('a0000000-0000-0000-0000-000000000001','Sunita Mondal','9000000001','SC',96000,'West Bengal','Nadia','Krishnanagar-I','Debnagar'),
 ('a0000000-0000-0000-0000-000000000002','Rakesh Soren','9000000002','ST',84000,'West Bengal','Nadia','Krishnanagar-I','Debnagar'),
 ('a0000000-0000-0000-0000-000000000003','Manoj Sarkar','9000000003','OBC',120000,'West Bengal','Nadia','Krishnanagar-I','Ghurni'),
 ('a0000000-0000-0000-0000-000000000004','Pushpa Das','9000000004','SC',72000,'West Bengal','Nadia','Chakdaha','Gayeshpur'),
 ('a0000000-0000-0000-0000-000000000005','Bimal Roy','9000000005','SC',108000,'West Bengal','Hooghly','Serampore','Baidyabati'),
 ('a0000000-0000-0000-0000-000000000006','Field Officer Nadia','9000000099','General',0,'West Bengal','Nadia','Krishnanagar-I','Debnagar')
ON CONFLICT (mobile) DO NOTHING;
UPDATE users SET role='FIELD_OFFICER' WHERE mobile='9000000099';
-- Demo password for every seeded user: demo1234 (bcrypt hash)
UPDATE users SET password_hash = '$2b$10$pw2V6/Rsb9UOPZYk/tO7HugCaAceHzVS.bvkCQ.DN3.XwzLPclGuy' WHERE password_hash = '';

INSERT INTO enterprises (id, user_id, business_title, business_category, available_margin_capital, estimated_total_cost, projected_monthly_revenue, projected_monthly_opex) VALUES
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Sunita Tailoring Unit','Tailoring',12000,120000,38000,22000),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Soren Dairy Cattle','Dairy',30000,300000,85000,52000),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','Sarkar Tea Stall','Food Stall',8000,90000,30000,21000),
 ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','Das Tailoring Corner','Tailoring',10000,100000,28000,17000),
 ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005','Roy Poultry Farm','Poultry',45000,450000,120000,78000)
ON CONFLICT DO NOTHING;

-- One approved sample loan with a generated schedule
INSERT INTO loans (id, enterprise_id, scheme_id, sanctioned_amount, applied_interest_rate, tenure_months, moratorium_months, status, sanctioned_date)
SELECT 'c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001', s.id,
       108000, s.interest_rate_pct, s.max_tenure_months, s.moratorium_months, 'DRAFT', CURRENT_DATE
FROM schemes s WHERE s.scheme_code='MFS'
ON CONFLICT DO NOTHING;
UPDATE loans SET status='APPROVED' WHERE id='c0000000-0000-0000-0000-000000000001' AND status='DRAFT';
SELECT generate_amortization_schedule('c0000000-0000-0000-0000-000000000001');
