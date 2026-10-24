"""End-to-end API smoke test. Needs Postgres with database/*.sql applied.
Run from backend/:  DATABASE_URL=postgresql+asyncpg://... python -m tests.smoke_test"""
import asyncio
import json
import random

import httpx

from app.agent import tools as T
from app.main import app

PASSWORD = "demo1234"


def ok(cond, label):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        raise SystemExit(1)


async def main():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        async def login(mobile, pw=PASSWORD):
            r = await c.post("/auth/login", json={"mobile": mobile, "password": pw})
            return r, {"Authorization": f"Bearer {r.json().get('access_token', '')}"}

        ok((await c.get("/health")).json() == {"status": "ok"}, "health")
        ok((await c.get("/dashboard")).status_code == 401, "dashboard requires token")
        ok((await login("9000000001", "wrong-password"))[0].status_code == 401, "wrong password rejected")

        r, sunita = await login("9000000001")
        ok(r.status_code == 200, "seeded beneficiary logs in")
        d = (await c.get("/dashboard", headers=sunita)).json()
        ok(d["loan"]["status"] == "APPROVED" and len(d["schedule"]) == 36, "seeded dashboard has 36-month schedule")
        ok(d["dscr_status"] in ("SAFE", "WATCH", "AT_RISK") and d["dscr"] > 0, f"dscr computed ({d['dscr']})")

        # register -> enterprise -> loan -> submit -> officer approves -> schedule
        reg = {"full_name": "Test User", "mobile": "9" + "".join(random.choice("0123456789") for _ in range(9)), "password": "longenough1", "caste_category": "SC",
               "annual_family_income": 90000, "state": "West Bengal", "district": "Nadia", "block": "Krishnanagar-I"}
        r = await c.post("/auth/register", json=reg)
        ok(r.status_code == 201, "register")
        user = {"Authorization": f"Bearer {r.json()['access_token']}"}
        ok((await c.post("/auth/register", json=reg)).status_code == 409, "duplicate mobile rejected")
        ok((await c.post("/auth/register", json={**reg, "mobile": "123"})).status_code == 422, "bad mobile rejected")

        ent = (await c.post("/enterprises", headers=user, json={
            "business_title": "Test Tailoring", "business_category": "Tailoring", "available_margin_capital": 12000,
            "estimated_total_cost": 120000, "projected_monthly_revenue": 38000, "projected_monthly_opex": 22000})).json()
        loan = (await c.post("/loans", headers=user, json={"enterprise_id": ent["id"]})).json()
        ok(loan["sanctioned_amount"] == 108000 and loan["status"] == "DRAFT", "loan drafted at 90% of cost")
        lid = loan["id"]
        ok((await c.post(f"/loans/{lid}/decision", headers=user, json={"action": "approve"})).status_code == 403, "beneficiary cannot approve")
        ok((await c.post(f"/loans/{lid}/submit", headers=user)).json()["status"] == "SUBMITTED", "submit")
        ok((await c.post(f"/loans/{lid}/submit", headers=user)).status_code == 409, "double submit rejected")

        _, officer = await login("9000000099")
        r = await c.post(f"/loans/{lid}/decision", headers=officer, json={"action": "approve"})
        ok(r.status_code == 200 and r.json()["status"] == "APPROVED", "officer approves in same district")
        sched = (await c.get(f"/loans/{lid}/schedule", headers=user)).json()
        ok(len(sched) == 36 and sched[-1]["closing_balance"] == 0, "approval hook generated schedule closing at 0")
        ok(sum(1 for s in sched if s["is_moratorium"]) == 3, "3 moratorium months")
        ok((await c.post(f"/loans/{lid}/decision", headers=officer, json={"action": "approve"})).status_code == 409, "re-approve rejected")
        audit = (await c.get(f"/loans/{lid}/audit", headers=user)).json()
        ok([a["action"] for a in audit][-1] == "STATUS_SUBMITTED_TO_APPROVED", f"audit trail ({len(audit)} entries)")
        ok((await c.patch(f"/loans/{lid}/schedule/1/pay", headers=user)).json()["payment_status"] == "PAID", "mark instalment paid")
        d = (await c.get("/dashboard", headers=user)).json()
        ok(d["progress"]["paid_months"] == 1, "dashboard progress reflects payment")
        ok((await c.get(f"/loans/{lid}/schedule", headers=sunita)).status_code == 404, "other users cannot read this loan")

        # advisory
        s = (await c.post("/advisory/scheme", headers=user, json={"margin_capital": 30000})).json()
        ok(s["scheme_code"] == "TLS" and s["total_project_cost"] == 300000 and "comparison" in s, "scheme match + comparison")
        cf = (await c.post("/advisory/counterfactual", headers=user, json={"margin": 5000, "requested_cost": 100000, "revenue": 20000, "opex": 17000})).json()
        ok(cf["viable"] is False and cf["recommendations"], f"counterfactual: {cf['message'][:70]}")
        den = (await c.get("/advisory/density", headers=user, params={"category": "Tailoring"})).json()
        ok(den["competitor_count"] >= 1, f"density ({den['saturation_level']})")

        # agent (offline mode, same tools)
        for q, needle in [("Which scheme fits my margin of ₹15,000?", "Term Loan"), ("Is my DSCR safe?", "DSCR"), ("How crowded is my market?", "Saturation")]:
            r = (await c.post("/agent/chat", headers=user, json={"message": q})).json()
            ok(needle in r["reply"] and r["mode"] == "offline", f"agent: {r['reply'][:60]}…")
            ok(len(r["trace"]) >= 1, "agent trace recorded")

    # SQL tool isolation
    T.current_user_id.set("a0000000-0000-0000-0000-000000000001")
    T.trace.set([])
    rows = json.loads(await T.query_database("SELECT status FROM v_my_loans"))
    ok(rows["row_count"] == 1, "SQL tool is scoped to the signed-in user")
    ok("error" in json.loads(await T.query_database("SELECT * FROM users")), "SQL tool blocks base tables")
    ok("error" in json.loads(await T.query_database("DELETE FROM loans")), "SQL tool blocks DML")
    print("\nALL CHECKS PASSED")


asyncio.run(main())
