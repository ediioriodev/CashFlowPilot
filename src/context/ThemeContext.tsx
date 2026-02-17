"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { useAuth } from "./AuthContext";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: async () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Initial Load: Check Local Storage or System Preference
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Apply immediately to avoid flash if possible (though in useEffect it runs after paint)
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  // 2. Sync with User Settings (DB) when logged in
  useEffect(() => {
    if (user && mounted) {
      userService.getSettings().then((settings) => {
        // If DB differs from local state, trust DB
        if (settings.dark_mode !== undefined && settings.dark_mode !== isDarkMode) {
             const userPrefersDark = settings.dark_mode;
             setIsDarkMode(userPrefersDark);
             if (userPrefersDark) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
             } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
             }
        }
      });
    }
  }, [user, mounted]);

  const toggleTheme = async () => {
    // Optimistic Update
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Apply immediately to DOM
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Persist to DB if logged in (Async)
    if (user) {
      try {
        await userService.updateSettings({ dark_mode: newMode });
      } catch (error) {
        console.error("Failed to save theme preference:", error);
      }
    }
  };

  if (!mounted) {
      // Prevent FOUC? Or just return null/loader
      // Returning children allows static shell but theme might be wrong
      return null; 
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
