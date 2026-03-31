"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Trophy, BarChart3, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/study", label: "DASHBOARD", icon: Brain },
  { href: "/ranking", label: "RANKING", icon: Trophy },
  { href: "/stats", label: "STATS", icon: BarChart3 },
  { href: "/settings", label: "PROFILE", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-[#2d3449]/60 backdrop-blur-2xl rounded-t-[2rem] border-t border-white/5">
        <div className="max-w-lg mx-auto flex items-end justify-around px-2 pt-2 pb-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200 ${
                  isActive
                    ? "scale-110"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] shadow-[0_0_16px_rgba(75,226,119,0.4)]"
                      : ""
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span
                  className={`text-[11px] font-semibold tracking-wide uppercase ${
                    isActive ? "text-[#4be277]" : ""
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
