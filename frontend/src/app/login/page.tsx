"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, session, type SessionUser } from "@/lib/api";

type Token = { access_token: string; user: SessionUser };
const inputCls = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError(null);
    try {
      const res = mode === "signin"
        ? await api<Token>("/auth/login", { method: "POST", body: { mobile: f.mobile, password: f.password } })
        : await api<Token>("/auth/register", { method: "POST", body: { ...f, annual_family_income: Number(f.annual_family_income), panchayat: f.panchayat || null } });
      session.save(res);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
      <div role="tablist" aria-label="Account" className="mt-4 inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
        {(["signin", "register"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
            className={`px-4 py-1.5 ${mode === m ? "bg-emerald-800 text-white" : "bg-white text-slate-700"}`}>
            {m === "signin" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4" key={mode}>
        {mode === "register" && (
          <label className="block text-sm font-medium">Full name<input name="full_name" required minLength={2} autoComplete="name" className={inputCls} /></label>
        )}
        <label className="block text-sm font-medium">Mobile number
          <input name="mobile" required inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" autoComplete="tel-national" className={inputCls} />
        </label>
        <label className="block text-sm font-medium">Password{mode === "register" && " (at least 8 characters)"}
          <input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "signin" ? "current-password" : "new-password"} className={inputCls} />
        </label>
        {mode === "register" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">Category
                <select name="caste_category" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select</option>
                  {["SC", "ST", "OBC", "General"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Family income a year (₹)
                <input name="annual_family_income" type="number" min={0} required className={inputCls} />
              </label>
            </div>
            <label className="block text-sm font-medium">State<input name="state" required defaultValue="West Bengal" className={inputCls} /></label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">District<input name="district" required className={inputCls} /></label>
              <label className="block text-sm font-medium">Block<input name="block" required className={inputCls} /></label>
            </div>
            <label className="block text-sm font-medium">Panchayat (optional)<input name="panchayat" className={inputCls} /></label>
          </>
        )}
        {error && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>}
        <button disabled={busy} className="w-full rounded-md bg-emerald-800 py-2.5 font-medium text-white disabled:opacity-50">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "signin" && (
        <p className="mt-6 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
          Demo accounts (password <code>demo1234</code>): borrower with an approved loan <code>9000000001</code>; field officer <code>9000000099</code>.
        </p>
      )}
    </div>
  );
}
