"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Cpu, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";

export function TechHero() {
  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-[#0B0C10] px-4 sm:px-6">
      {/* Background Matrix & Subtle Gradient Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Floating Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[250px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Content Container */}
      <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center space-y-8 z-10 py-12">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-300 tracking-wide">
            SIH 2026 · Problem SIH26091
          </span>
          <span className="text-zinc-600 text-xs">|</span>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> NBCFDC & NSFDC Compliant
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl">
          Autonomous Financial Engine for{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Rural Enterprises
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed font-normal">
          Statutory 10% equity validation, automatic 36-month amortized debt generation, and proactive counterfactual cashflow safety analysis for underserved micro-entrepreneurs.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/advisor"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Launch AI Financial Advisor
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/calculator"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-200 font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md"
          >
            Open Loan Calculator
          </Link>
        </div>

        {/* Interactive Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl pt-8">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">LangChain Core</div>
              <div className="text-[11px] text-zinc-500">Autonomous conversational agent</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">DSCR Guardrails</div>
              <div className="text-[11px] text-zinc-500">Real-time viability calculations</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">PostgreSQL Native</div>
              <div className="text-[11px] text-zinc-500">Statutory database trigger enforcement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}