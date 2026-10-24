"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatDrawer from "./ChatDrawer";
import { session, useSession } from "@/lib/api";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calculator", label: "Calculator" },
  { href: "/advisor", label: "Advisor" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useSession();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-900">ArthaSathi</Link>
          <nav aria-label="Main" className="flex gap-1 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                className={`rounded px-3 py-1.5 ${pathname.startsWith(l.href) ? "bg-emerald-50 font-medium text-emerald-900" : "text-slate-700 hover:bg-slate-100"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {ready && user && pathname !== "/advisor" && (
              <button onClick={() => setChatOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800 px-3 py-1.5 text-emerald-900 hover:bg-emerald-50">
                <MessageCircle className="h-4 w-4" aria-hidden /> Ask the advisor
              </button>
            )}
            {ready && (user ? (
              <>
                <span className="hidden text-slate-600 sm:inline">{user.full_name}</span>
                <button onClick={() => { session.clear(); setChatOpen(false); window.location.href = "/"; }} className="text-slate-700 underline">Sign out</button>
              </>
            ) : (
              <Link href="/login" className="rounded-md bg-emerald-800 px-3 py-1.5 font-medium text-white">Sign in</Link>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600">
        ArthaSathi · Smart India Hackathon 2026, problem statement SIH26091 · Ministry of Social Justice and Empowerment
      </footer>
      {user && <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
