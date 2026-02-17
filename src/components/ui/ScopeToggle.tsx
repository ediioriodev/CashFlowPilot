"use client";

import { useScope } from "@/context/ScopeContext";
import { Users, User } from "lucide-react";
import clsx from "clsx";

export default function ScopeToggle() {
  const { scope, setScope, availableScopes } = useScope();

  // If only one scope is available (or somehow none), hide the toggle
  if (!availableScopes.hasPersonal || !availableScopes.hasShared) {
    return null;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg inline-flex items-center shadow-inner">
      <button
        onClick={() => setScope('C')}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
          scope === 'C' 
            ? "bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-200 shadow-sm" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
        )}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Condiviso</span>
      </button>
      <button
        onClick={() => setScope('P')}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
          scope === 'P' 
            ? "bg-white dark:bg-gray-600 text-indigo-700 dark:text-indigo-200 shadow-sm" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
        )}
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Personale</span>
      </button>
    </div>
  );
}
