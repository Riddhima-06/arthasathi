"use client";

import { useState } from "react";
import { Info, AlertCircle } from "lucide-react";

export default function CalculatorPage() {
  const [margin, setMargin] = useState(12000);

  // Statutory 10% Margin : 90% Loan Formula
  const totalProject = margin * 10;
  const loanAmount = totalProject * 0.9;
  const interestRate = 6.5;
  const tenureMonths = 36;
  const monthlyRate = interestRate / 100 / 12;

  // EMI formula
  const emiWithoutMoratorium = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );

  const emiWith3MoMoratorium = Math.round(
    ((loanAmount * (1 + monthlyRate * 3)) *
      monthlyRate *
      Math.pow(1 + monthlyRate, tenureMonths - 3)) /
      (Math.pow(1 + monthlyRate, tenureMonths - 3) - 1)
  );

  const totalPaybackWithout = emiWithoutMoratorium * tenureMonths;
  const totalPaybackWith = emiWith3MoMoratorium * (tenureMonths - 3);

  return (
    <div className="min-h-full bg-[#0B0C10] text-zinc-100 px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Loan & Margin Calculator</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Compute project viability according to the statutory 10% borrower margin requirement and 90% institutional funding split.
          </p>
        </div>

        {/* Margin Input Slider */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <label className="text-sm font-semibold text-zinc-200">Margin Money You Can Bring</label>
              <p className="text-xs text-zinc-500">Represents statutory 10% equity towards your enterprise</p>
            </div>
            <div className="px-5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl font-mono text-emerald-400 font-bold text-xl self-start sm:self-auto">
              ₹{margin.toLocaleString("en-IN")}
            </div>
          </div>
          <input
            type="range"
            min={5000}
            max={50000}
            step={1000}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>₹5,000</span>
            <span>₹25,000</span>
            <span>₹50,000</span>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Statutory Scheme Split */}
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-medium">Eligible Scheme</div>
              <h3 className="text-xl font-bold text-white mt-1">Micro Finance Scheme</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Auto-selected for project size of ₹{totalProject.toLocaleString("en-IN")}</p>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="bg-amber-500 h-full w-[10%]" title="10% Margin" />
                <div className="bg-emerald-500 h-full w-[90%]" title="90% Loan" />
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-amber-400">10% Margin: ₹{margin.toLocaleString("en-IN")}</span>
                <span className="text-emerald-400">90% Loan: ₹{loanAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="divide-y divide-white/5 text-sm space-y-2 pt-2">
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Interest rate</span>
                <span className="font-mono text-zinc-200">{interestRate}% per annum</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Tenure</span>
                <span className="font-mono text-zinc-200">{tenureMonths} months</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Grace / Moratorium</span>
                <span className="font-mono text-zinc-200">3 months</span>
              </div>
              <div className="flex justify-between py-2 text-base font-bold">
                <span className="text-white">Instalment After Moratorium</span>
                <span className="font-mono text-emerald-400">₹{emiWith3MoMoratorium.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Moratorium Impact */}
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Moratorium Comparison</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Evaluating cashflow stability during initial launch</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-emerald-500/20 space-y-1.5">
                  <div className="text-xs text-emerald-400 font-medium">With 3M Grace</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    ₹{emiWith3MoMoratorium.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-zinc-500">Total: ₹{totalPaybackWith.toLocaleString("en-IN")}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1.5">
                  <div className="text-xs text-zinc-400 font-medium">Without Grace</div>
                  <div className="text-2xl font-bold font-mono text-zinc-300">
                    ₹{emiWithoutMoratorium.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-zinc-500">Total: ₹{totalPaybackWithout.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                The 3-month moratorium gives your enterprise the runway needed to stabilize operating cash flows before regular repayment starts.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}