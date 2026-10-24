import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { CounterfactualResult } from "@/lib/api";
import { inr } from "@/lib/utils";

export default function CounterfactualCard({ result }: { result: CounterfactualResult }) {
  const tone = result.viable ? "border-emerald-300 bg-emerald-50" : "border-saffron-600/40 bg-saffron-50";
  const Icon = result.viable ? CheckCircle2 : TriangleAlert;
  return (
    <section aria-label="Plan check" className={`rounded-lg border p-4 ${tone}`}>
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon className={`h-5 w-5 ${result.viable ? "text-emerald-700" : "text-saffron-600"}`} aria-hidden />
        {result.viable ? "This plan can carry the loan" : "This plan needs changes before it can carry the loan"}
      </h3>

      {result.dscr !== undefined && (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><dt className="text-slate-600">DSCR</dt><dd className="text-lg font-semibold tabular-nums">{result.dscr.toFixed(2)}</dd></div>
          <div><dt className="text-slate-600">Margin share</dt><dd className="text-lg font-semibold tabular-nums">{result.margin_ratio_pct}%</dd></div>
          <div><dt className="text-slate-600">Monthly instalment</dt><dd className="text-lg font-semibold tabular-nums">{inr(result.prospective_emi ?? 0)}</dd></div>
          <div><dt className="text-slate-600">Monthly surplus</dt><dd className="text-lg font-semibold tabular-nums">{inr(result.net_operating_income ?? 0)}</dd></div>
        </dl>
      )}

      {result.recommendations && result.recommendations.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-900">
          {result.recommendations?.map((r: string, idx: number) => (
            <li key={r} className="rounded border border-saffron-600/30 bg-white px-3 py-2">{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-700">{result.message}</p>
      )}
      <p className="mt-3 text-xs text-slate-600">DSCR is monthly surplus divided by the instalment. Lenders look for at least 1.25; 1.30 leaves a comfortable cushion.</p>
    </section>
  );
}
