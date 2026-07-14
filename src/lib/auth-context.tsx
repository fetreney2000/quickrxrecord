"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Peranan } from "@/types";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (nama_pengguna: string, kata_laluan: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signIn = async (nama_pengguna: string, kata_laluan: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${nama_pengguna}@quickrx.local`,
        password: kata_laluan,
      });

      if (error) {
        return { error: "Nama pengguna atau kata laluan salah." };
      }
      return { error: null };
    } catch {
      return { error: "Ralat semasa log masuk. Sila cuba lagi." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth mesti digunakan dalam AuthProvider");
  }
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