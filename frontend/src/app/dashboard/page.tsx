"use client";

import { CheckCircle2, Calendar, TrendingUp, Clock, IndianRupee, FileText, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const beneficiary = {
    name: "Sunita Mondal",
    mobile: "9000000001",
    enterprise: "Mondal Tailoring & Handicrafts",
    category: "Scheduled Caste (SC)",
    scheme: "NBCFDC Micro Finance Scheme",
    loanAmount: 108000,
    marginMoney: 12000,
    totalProject: 120000,
    interestRate: 6.5,
    tenureMonths: 36,
    status: "APPROVED",
    dscr: 1.68,
    nextEmiDate: "10 Nov 2026",
    nextEmiAmount: 3583,
  };

  return (
    <div className="min-h-full bg-[#0B0C10] text-zinc-100 px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Main Beneficiary Header Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950/80 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {beneficiary.enterprise}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {beneficiary.status}
              </span>
            </div>
            <p className="text-zinc-400 text-sm">
              Beneficiary: <span className="text-zinc-200 font-medium">{beneficiary.name}</span> ({beneficiary.mobile}) · {beneficiary.scheme}
            </p>
          </div>

          <div className="text-left md:text-right bg-black/30 p-4 rounded-xl border border-white/5">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-mono">Approved Facility</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              ₹{beneficiary.loanAmount.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-0.5">
              {beneficiary.interestRate}% interest · {beneficiary.tenureMonths} mo amortization
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DSCR Health Card */}
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-3">
            <div className="flex justify-between items-center text-zinc-400 text-xs">
              <span className="uppercase tracking-wider font-mono">Debt Coverage (DSCR)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-emerald-400">{beneficiary.dscr}x</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25">
                SAFE
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Operating cashflow covers monthly obligations by 168%, satisfying statutory viability benchmarks.
            </p>
          </div>

          {/* Next Instalment */}
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-3">
            <div className="flex justify-between items-center text-zinc-400 text-xs">
              <span className="uppercase tracking-wider font-mono">Next Due Instalment</span>
              <Calendar className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              ₹{beneficiary.nextEmiAmount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-zinc-400">
              Scheduled auto-debit on <span className="text-zinc-200 font-medium">{beneficiary.nextEmiDate}</span>.
            </p>
          </div>

          {/* Repayment Progress */}
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md space-y-3">
            <div className="flex justify-between items-center text-zinc-400 text-xs">
              <span className="uppercase tracking-wider font-mono">Amortization Tenure</span>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Tenure Elapsed</span>
                <span className="font-mono text-zinc-200">1 / {beneficiary.tenureMonths} Months</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[5%]" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              3-Month moratorium ended. 35 scheduled repayments remaining.
            </p>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Statutory Financial Structure</h2>
              <p className="text-xs text-zinc-400">Automated ledger partitioning based on Scheme SIH26091 rules</p>
            </div>
            <Link
              href="/calculator"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              Re-calculate Parameters <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Project Cost</span>
              <div className="text-xl font-bold font-mono text-zinc-100">₹{beneficiary.totalProject.toLocaleString("en-IN")}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">10% Beneficiary Margin</span>
              <div className="text-xl font-bold font-mono text-amber-400">₹{beneficiary.marginMoney.toLocaleString("en-IN")}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">90% Scheme Loan</span>
              <div className="text-xl font-bold font-mono text-emerald-400">₹{beneficiary.loanAmount.toLocaleString("en-IN")}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Statutory Moratorium</span>
              <div className="text-xl font-bold font-mono text-zinc-300">3 Months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
