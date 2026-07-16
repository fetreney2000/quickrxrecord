"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Patient } from "@/types";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-header px-4 md:px-6 w-full shadow-sm">
      <div className="flex-1" />
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-primary/60" />
        </div>
        <Input type="search" placeholder="🔍 Cari pesakit..." 
          className="pl-10 pr-4 w-full h-10 rounded-full border-2 border-primary/20 bg-primary/5 focus:bg-white focus:border-primary/50 transition-all duration-200 placeholder:text-muted-foreground/60 text-sm shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-primary/20"
          value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && (searchResults.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-primary/10 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            {searching && <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" /> Mencari...</div>}
            {searchResults.map((patient) => (
              <button key={patient.id} className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0 group"
                onMouseDown={() => handleSelectPatient(patient.id)}
              >
                <div className="font-medium text-sm group-hover:text-primary transition-colors">{patient.nama}</div>
                <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                  {patient.nombor_kad_pengenalan && <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-primary/40 inline-block" /> KP: {patient.nombor_kad_pengenalan}</span>}
                  {patient.nombor_pendaftaran_hospital && <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-primary/40 inline-block" /> Hosp: {patient.nombor_pendaftaran_hospital}</span>}
                </div>
              </button>
            ))}
            {!searching && searchResults.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">Tiada pesakit dijumpai.</div>}
          </div>
        )}
      </div>

    </header>
  );
}
