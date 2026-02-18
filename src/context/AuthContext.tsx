"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { UserSettings, userService, UserProfile } from "@/services/userService";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  settings: UserSettings | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  settings: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastUserId = useRef<string | null>(null);

  const loadSettingsAndProfile = async (userId: string) => {
    try {
      const [settingsData, profileData] = await Promise.all([
        userService.getSettings(),
        userService.getProfile()
      ]);
      setSettings(settingsData);
      setProfile(profileData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      // Impostiamo loading a false SUBITO dopo aver recuperato la sessione
      setLoading(false);
      
      if (session?.user && session.user.id !== lastUserId.current) {
        lastUserId.current = session.user.id;
        // Carica i settings in background senza bloccare il rendering
        loadSettingsAndProfile(session.user.id).catch(err => console.error("Background data load failed", err));
      }
    };

    getSession();


    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Ensure loading is false
        setLoading(false);

        if (session?.user) {
          // Prevent redundant profile loads
          if (session.user.id !== lastUserId.current || event === 'SIGNED_IN') {
             lastUserId.current = session.user.id;
             // Don't await this to keep UI responsive
             loadSettingsAndProfile(session.user.id).catch(console.error);
          }
        } else {
          lastUserId.current = null;
          setSettings(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSettings(null);
    setProfile(null);
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
      if (user) loadSettingsAndProfile(user.id);
    }
  };

  const refreshSettings = async () => {
    if (user) {
      await loadSettingsAndProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, settings, profile, loading, signOut, updateSettings, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
