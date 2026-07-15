"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Profile, Peranan } from "@/types";

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  signIn: (nama_pengguna: string, kata_laluan: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "quickrx_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      // Try to restore session from localStorage
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile(parsed);
      } else {
        // Fallback: try server-side cookie (for SSR/initial load)
        const res = await fetch("/api/session");
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          localStorage.setItem(SESSION_KEY, JSON.stringify(data.profile));
        }
      }
    } catch {
      // No session
    }
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!profile) return;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}&select=*`, {
        headers: {
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const { kata_laluan_hash, ...safeProfile } = data[0];
          setProfile(safeProfile);
          localStorage.setItem(SESSION_KEY, JSON.stringify(safeProfile));
        }
      }
    } catch {}
  }, [profile]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = async (nama_pengguna: string, kata_laluan: string) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_pengguna, kata_laluan }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Log masuk gagal." };
      setProfile(data.profile);
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.profile));
      return { error: null };
    } catch {
      return { error: "Ralat semasa log masuk. Sila cuba lagi." };
    }
  };

  const signOut = async () => {
    setProfile(null);
    localStorage.removeItem(SESSION_KEY);
    // Also try to clear server-side cookie
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth mesti digunakan dalam AuthProvider");
  return context;
}

export function hasPermission(role: Peranan | undefined, action: string): boolean {
  if (!role) return false;
  const permissions: Record<Peranan, string[]> = {
    Pentadbir: ["manage_users", "manage_items", "manage_patients", "manage_supply", "view_reports", "export_reports", "merge_patients", "manage_batches", "view_items", "view_patients", "manage_assignments"],
    "Penjaga Stor": ["manage_items", "manage_patients", "manage_supply", "view_reports", "export_reports", "merge_patients", "manage_batches", "view_items", "view_patients", "manage_assignments"],
    "Kakitangan Farmasi": ["manage_patients", "manage_supply", "view_reports", "export_reports", "view_items", "view_patients", "manage_assignments"],
    "Kakitangan Klinik": ["view_items", "view_patients"],
  };
  return permissions[role]?.includes(action) ?? false;
}