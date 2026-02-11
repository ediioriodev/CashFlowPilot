"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut, Settings, User as UserIcon, Wallet, UserPlus, Home } from "lucide-react";
import ScopeToggle from "../ui/ScopeToggle";
import { useAuth } from "@/context/AuthContext";
import { useScope } from "@/context/ScopeContext";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { scope } = useScope();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine if we should show the full header elements
  const isAuthPage = pathname === "/login" || pathname === "/register";
  
  if (isAuthPage || !user) {
    return null;
  }

  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-50">
      {/* Left: Logo (Home) or Back Button (Others) */}
      <div className="w-24 flex items-center justify-start">
        {isHome ? (
           <Link href="/" className="flex items-center gap-2">
             <Wallet className={`w-6 h-6 ${scope === 'P' ? 'text-indigo-600' : 'text-blue-600'}`} />
             {/* <span className="font-bold text-lg text-gray-800 hidden sm:block"></span> */}
           </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Center: Scope Toggle - Absolutely Centered */}
      <div className="absolute inset-x-0 mx-auto w-fit flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
             <ScopeToggle />
          </div>
      </div>

      {/* Right: User Menu */}
      <div className="flex justify-end items-center gap-1">
        <Link 
          href="/" 
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Home"
        >
          <Home className="w-6 h-6" />
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="User menu"
        >
          <UserIcon className="w-6 h-6" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email}
              </p>
            </div>
            
            <Link
              href="/account"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <UserIcon className="w-4 h-4" />
              Profilo
            </Link>

            <Link
              href="/impostazioni"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Impostazioni
            </Link>

            <Link
              href="/inviti"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <UserPlus className="w-4 h-4" />
              Invita Membri
            </Link>
            
            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
