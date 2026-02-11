"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { userService } from "@/services/userService";

type ScopeType = 'C' | 'P'; // C = Condiviso/Comune (Shared), P = Personale (Personal)

interface ScopeContextType {
  scope: ScopeType;
  setScope: (scope: ScopeType) => void;
  isInitialized: boolean;
  availableScopes: { hasPersonal: boolean; hasShared: boolean };
  refreshScope: () => Promise<void>;
}

const ScopeContext = createContext<ScopeContextType>({
  scope: 'C',
  setScope: () => {},
  isInitialized: false,
  availableScopes: { hasPersonal: true, hasShared: true },
  refreshScope: async () => {},
});

export const ScopeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [scope, setScope] = useState<ScopeType>('C');
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableScopes, setAvailableScopes] = useState({ hasPersonal: true, hasShared: true });

  const updateScope = useCallback((newScope: ScopeType) => {
    setScope(newScope);
    localStorage.setItem('app_scope', newScope);
  }, []);

  // Initial load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('app_scope') as ScopeType;
    if (saved && (saved === 'C' || saved === 'P')) {
      setScope(saved);
    }
    setIsInitialized(true);
  }, []);

  const refreshScope = useCallback(async () => {
      if (!user) return;
      try {
        const settings = await userService.getSettings();
        const newScopes = {
          hasPersonal: settings.show_personal_expenses,
          hasShared: settings.show_shared_expenses
        };
        
        setAvailableScopes(newScopes);
        
        // Enforce constraints
        if (newScopes.hasPersonal && !newScopes.hasShared) {
           updateScope('P');
        } else if (!newScopes.hasPersonal && newScopes.hasShared) {
           updateScope('C');
        } else if (!newScopes.hasPersonal && !newScopes.hasShared) {
           // Fallback if both false (should satisfy constraint validation elsewhere)
           // Default to shared if messed up
           updateScope('C'); 
        }
        
      } catch (error) {
        console.error("Failed to sync scope settings", error);
      }
  }, [user, updateScope]);

  // Sync with user settings
  useEffect(() => {
    if (user) {
      refreshScope();
    }
  }, [user, refreshScope]);

  return (
    <ScopeContext.Provider value={{ scope, setScope: updateScope, isInitialized, availableScopes, refreshScope }}>
      {children}
    </ScopeContext.Provider>
  );
};

export const useScope = () => useContext(ScopeContext);
