"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { inr, shortDate } from "@/lib/utils";

export type ScheduleRow = {
  month_number: number;
  due_date: string;
  is_moratorium: boolean;
  opening_balance: number;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  closing_balance: number;
  payment_status: "PENDING" | "PAID" | "OVERDUE";
};

type Phase = "ALL" | "MORATORIUM" | "REPAYMENT";
type Status = "ALL" | ScheduleRow["payment_status"];
const PAGE = 12;

const statusStyle: Record<ScheduleRow["payment_status"], string> = {
  PAID: "bg-emerald-100 text-emerald-900",
  PENDING: "bg-slate-100 text-slate-700",
  OVERDUE: "bg-amber-100 text-amber-900",
};

export default function AmortizationTable({ rows }: { rows: ScheduleRow[] }) {
  const [phase, setPhase] = useState<Phase>("ALL");
  const [status, setStatus] = useState<Status>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (phase === "MORATORIUM" && !r.is_moratorium) return false;
      if (phase === "REPAYMENT" && r.is_moratorium) return false;
      if (status !== "ALL" && r.payment_status !== status) return false;
      if (q && !(String(r.month_number) === q || shortDate(r.due_date).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, phase, status, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const totals = useMemo(
    () => ({
      interest: filtered.reduce((s, r) => s + Number(r.interest_component), 0),
      principal: filtered.reduce((s, r) => s + Number(r.principal_component), 0),
    }),
    [filtered]
  );
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  return (
    <section aria-label="Repayment schedule" className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <div role="group" aria-label="Phase" className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {(["ALL", "MORATORIUM", "REPAYMENT"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => reset(setPhase)(p)}
              aria-pressed={phase === p}
              className={`px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${phase === p ? "bg-emerald-800 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {p === "ALL" ? "All months" : p === "MORATORIUM" ? "Moratorium" : "Repayment"}
            </button>
          ))}
        </div>
        <label className="text-sm text-slate-600">
          <span className="sr-only">Payment status</span>
          <select
            value={status}
            onChange={(e) => reset(setStatus)(e.target.value as Status)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
          >
            <option value="ALL">Any status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </label>
        <label className="relative ml-auto">
          <span className="sr-only">Find a month</span>
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Month no. or Mar 2027"
            className="w-48 rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm tabular-nums">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 font-medium">Due</th>
              <th className="px-4 py-2 text-right font-medium">Opening</th>
              <th className="px-4 py-2 text-right font-medium">Instalment</th>
              <th className="px-4 py-2 text-right font-medium">Principal</th>
              <th className="px-4 py-2 text-right font-medium">Interest</th>
              <th className="px-4 py-2 text-right font-medium">Closing</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No instalments match these filters. Clear a filter to see the full schedule.</td></tr>
            )}
            {slice.map((r) => (
              <tr key={r.month_number} className={`border-t border-slate-100 ${r.is_moratorium ? "bg-emerald-50/60" : ""}`}>
                <td className="px-4 py-2">
                  {r.month_number}
                  {r.is_moratorium && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900">moratorium</span>}
                </td>
                <td className="px-4 py-2">{shortDate(r.due_date)}</td>
                <td className="px-4 py-2 text-right">{inr(r.opening_balance)}</td>
                <td className="px-4 py-2 text-right font-medium">{inr(r.emi_amount)}</td>
                <td className="px-4 py-2 text-right">{inr(r.principal_component)}</td>
                <td className="px-4 py-2 text-right">{inr(r.interest_component)}</td>
                <td className="px-4 py-2 text-right">{inr(r.closing_balance)}</td>
                <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs ${statusStyle[r.payment_status]}`}>{r.payment_status.toLowerCase()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
        <span>
          {filtered.length} instalments · principal {inr(totals.principal)} · interest {inr(totals.interest)}
        </span>
        <span className="inline-flex items-center gap-2">
          <button aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded border border-slate-300 p-1 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          Page {safePage + 1} of {pages}
          <button aria-label="Next page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="rounded border border-slate-300 p-1 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
    </section>
  );
}
