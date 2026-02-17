"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { UserSettings, userService } from "@/services/userService";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  settings: UserSettings | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  settings: null,
  loading: true,
  signOut: async () => {},
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadSettings = async (userId: string) => {
    try {
      const data = await userService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadSettings(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadSettings(session.user.id);
        } else {
          setSettings(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSettings(null);
    router.push("/login");
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    // Optimistic update
    if (settings) {
      setSettings({ ...settings, ...newSettings });
    }
    
    try {
      await userService.updateSettings(newSettings);
      // We could reload here to be sure, but optimistic is fine usually
    } catch (error) {
      console.error("Failed to update settings:", error);
      // Revert if needed, but for now just reload
      if (user) loadSettings(user.id);
    }
  };

  const refreshSettings = async () => {
    if (user) {
      await loadSettings(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, settings, loading, signOut, updateSettings, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
