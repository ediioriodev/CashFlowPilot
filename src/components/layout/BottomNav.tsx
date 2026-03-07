"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, List, PieChart, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useScope } from "@/context/ScopeContext";

const navItems = [
  { href: "/", icon: Home, label: "Home", exact: true },
  { href: "/spese/nuova", icon: PlusCircle, label: "Nuova" },
  { href: "/spese", icon: List, label: "Storico" },
  { href: "/analisi", icon: PieChart, label: "Analisi" },
  { href: "/report", icon: BarChart3, label: "Report" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { scope } = useScope();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password";

  if (isAuthPage || !user) return null;

  const activeColor =
    scope === "C"
      ? "text-blue-600 dark:text-blue-400"
      : "text-indigo-600 dark:text-indigo-400";
  const inactiveColor = "text-gray-400 dark:text-gray-500";

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return pathname === item.href;
    if (item.href === "/spese")
      return pathname.startsWith("/spese") && !pathname.startsWith("/spese/nuova");
    return pathname.startsWith(item.href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 flex items-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map(({ href, icon: Icon, label, ...item }) => {
          const active = isActive({ href, icon: Icon, label, ...item });
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                active ? activeColor : inactiveColor
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
