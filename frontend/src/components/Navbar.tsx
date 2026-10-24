"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Calculator, LayoutDashboard, Sparkles, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/calculator", label: "Calculator", icon: Calculator },
    { href: "/advisor", label: "Advisor", icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0C10]/85 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              ArthaSathi
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/advisor"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask the advisor</span>
            <span className="sm:hidden">Advisor</span>
          </Link>
          <div className="flex items-center gap-3 pl-3 border-l border-white/10 text-xs">
            <span className="text-zinc-300 font-medium hidden sm:inline">Sunita Mondal</span>
            <Link
              href="/login"
              className="text-zinc-500 hover:text-red-400 transition-colors p-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
