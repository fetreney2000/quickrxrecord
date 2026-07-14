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
import { Search, User, LogOut } from "lucide-react";
import type { Patient } from "@/types";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const { profile, signOut } = useAuth();
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

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 w-full">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Cari pesakit (nama, KP, no. hospital)..." className="pl-8 w-full"
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

      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel><div><p className="text-sm font-medium">{profile?.nama}</p><p className="text-xs text-muted-foreground">{profile?.peranan}</p></div></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}><LogOut className="mr-2 h-4 w-4" /> Log Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}