"use client";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr, shortDate } from "@/lib/utils";
import type { ScheduleRow } from "./AmortizationTable";

export type CashFlowPoint = { label: string; revenue: number; opex: number; emi: number; net: number };

/** Turn a repayment schedule plus projected monthly revenue/opex into a cash-flow forecast. */
export function buildCashFlow(rows: ScheduleRow[], monthlyRevenue: number, monthlyOpex: number): CashFlowPoint[] {
  return rows.map((r) => ({
    label: shortDate(r.due_date),
    revenue: monthlyRevenue,
    opex: monthlyOpex,
    emi: Number(r.emi_amount),
    net: monthlyRevenue - monthlyOpex - Number(r.emi_amount),
  }));
}

export default function CashFlowChart({ data, moratoriumMonths = 0 }: { data: CashFlowPoint[]; moratoriumMonths?: number }) {
  if (data.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Add a loan to see how your monthly cash flow holds up after instalments.</p>;
  }
  const lowest = Math.min(...data.map((d) => d.net));
  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="mb-3 text-sm text-slate-600">
        Cash left each month after operating costs and the loan instalment.
        {lowest < 0 && <strong className="ml-1 text-amber-800">Goes negative in some months.</strong>}
      </figcaption>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={52} />
            <Tooltip formatter={(v: number, name: string) => [inr(v), name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#64748b" />
            {moratoriumMonths > 0 && data[moratoriumMonths - 1] && (
              <ReferenceLine x={data[moratoriumMonths - 1].label} stroke="#0f766e" strokeDasharray="4 4" label={{ value: "Moratorium ends", fontSize: 11, fill: "#0f766e", position: "insideTopRight" }} />
            )}
            <Area type="monotone" dataKey="net" name="Cash after EMI" stroke="#065f46" fill="#a7f3d0" fillOpacity={0.55} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1d4ed8" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="opex" name="Operating cost" stroke="#b45309" dot={false} strokeWidth={2} />
            <Line type="stepAfter" dataKey="emi" name="Instalment" stroke="#7c3aed" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
