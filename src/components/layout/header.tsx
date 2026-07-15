"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Search, Bell, BellRing, RefreshCw } from "lucide-react";
import type { Patient } from "@/types";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("patients")
      .select("id, nama, nombor_kad_pengenalan, nombor_pendaftaran_hospital")
      .or(`nama.ilike.%${query}%,nombor_kad_pengenalan.ilike.%${query}%,nombor_pendaftaran_hospital.ilike.%${query}%`)
      .eq("aktif", true).is("merged_into", null).limit(10);
    setSearchResults((data as Patient[]) || []);
    setSearching(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => { searchPatients(searchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  const handleSelectPatient = (id: string) => {
    setShowResults(false);
    setSearchQuery("");
    router.push(`/pesakit/${id}`);
  };

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    setLoadingNotif(true);
    try {
      const res = await fetch(`/api/notifications?userId=${profile.id}&role=${profile.peranan}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {}
    setLoadingNotif(false);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-header px-4 md:px-6 w-full">
      <div className="flex-1" />
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Cari Pesakit..." className="pl-8 w-full"
          value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && (searchResults.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
            {searching && <div className="px-4 py-2 text-sm text-muted-foreground">Mencari...</div>}
            {searchResults.map((patient) => (
              <button key={patient.id} className="w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b last:border-0"
                onMouseDown={() => handleSelectPatient(patient.id)}
              >
                <div className="font-medium text-sm">{patient.nama}</div>
                <div className="text-xs text-muted-foreground">
                  {patient.nombor_kad_pengenalan && `KP: ${patient.nombor_kad_pengenalan}`}
                  {patient.nombor_kad_pengenalan && patient.nombor_pendaftaran_hospital && " • "}
                  {patient.nombor_pendaftaran_hospital && `Hosp: ${patient.nombor_pendaftaran_hospital}`}
                </div>
              </button>
            ))}
            {!searching && searchResults.length === 0 && <div className="px-4 py-2 text-sm text-muted-foreground">Tiada pesakit dijumpai.</div>}
          </div>
        )}
      </div>

      {/* Notification Bell */}
      <div className="relative">
        <button
          className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors"
          onClick={() => setShowNotif(!showNotif)}
          title="Notifikasi"
        >
          {notifications.filter(n => n.severity === "critical").length > 0 ? (
            <BellRing className="h-5 w-5 text-destructive" />
          ) : (
            <Bell className="h-5 w-5 text-foreground/70" />
          )}
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>

        {showNotif && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-4 py-2.5 flex items-center justify-between">
              <p className="text-sm font-semibold">Notifikasi</p>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={fetchNotifications}>
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            {loadingNotif ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Memuatkan...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Tiada notifikasi baharu.</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`px-4 py-3 border-b last:border-0 hover:bg-accent/30 transition-colors ${notif.severity === "critical" ? "bg-red-50" : notif.severity === "warning" ? "bg-amber-50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${notif.severity === "critical" ? "bg-red-500" : notif.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                        <p className="text-xs font-semibold">{notif.title}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0 mt-1"
                      onClick={() => markAsRead(notif.id)}
                      title="Tutup"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{new Date(notif.created_at).toLocaleString("ms-MY")}</span>
                    {notif.link && (
                      <a href={notif.link} className="text-[10px] font-medium text-primary hover:underline" onClick={() => setShowNotif(false)}>
                        Lihat &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </header>
  );
}
