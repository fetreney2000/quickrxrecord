"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Search, Loader2 } from "lucide-react";
import type { Patient } from "@/types";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
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
    <header style={styles.header}>
      {/* Subtle background gradient */}
      <div style={styles.headerBg} />

      <div style={styles.headerInner}>
        {/* Left spacer */}
        <div style={{ flex: 1 }} />

        {/* Search bar */}
        <div style={styles.searchWrapper}>
          <div style={{
            ...styles.searchContainer,
            ...(focused ? styles.searchContainerFocused : {}),
          }}>
            <div style={styles.searchIconWrapper}>
              <Search size={16} color={focused ? "#1877f2" : "#9ca3af"} />
            </div>
            <input
              type="search"
              placeholder="Cari pesakit..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
              onFocus={() => { setFocused(true); setShowResults(true); }}
              onBlur={() => { setFocused(false); setTimeout(() => setShowResults(false), 200); }}
            />
            {searching && (
              <div style={styles.searchLoader}>
                <Loader2 size={14} color="#1877f2" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && (searchResults.length > 0 || searching) && (
            <div style={styles.searchDropdown}>
              {searching && searchResults.length === 0 && (
                <div style={styles.searchingText}>
                  <span style={styles.searchingDot} />
                  Mencari...
                </div>
              )}
              {searchResults.map((patient) => (
                <button
                  key={patient.id}
                  style={styles.searchResultItem}
                  onMouseDown={() => handleSelectPatient(patient.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(24, 119, 242, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={styles.resultName}>{patient.nama}</div>
                  <div style={styles.resultMeta}>
                    {patient.nombor_kad_pengenalan && (
                      <span style={styles.resultBadge}>KP: {patient.nombor_kad_pengenalan}</span>
                    )}
                    {patient.nombor_pendaftaran_hospital && (
                      <span style={styles.resultBadge}>Hosp: {patient.nombor_pendaftaran_hospital}</span>
                    )}
                  </div>
                </button>
              ))}
              {!searching && searchResults.length === 0 && (
                <div style={styles.noResults}>Tiada pesakit dijumpai.</div>
              )}
            </div>
          )}
        </div>

        {/* Right spacer */}
        <div style={{ flex: 1 }} />
      </div>

      <style>{`
        @-webkit-keyframes spin {
          from { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
          to { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration {
          -webkit-appearance: none;
        }
      `}</style>
    </header>
  );
}

/* ── Styles (Chrome 109 compatible) ──────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    height: "64px",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
    background: "rgba(255, 255, 255, 0.95)",
    WebkitBackdropFilter: "blur(16px)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  headerBg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, rgba(24, 119, 242, 0.03) 0%, rgba(124, 58, 237, 0.02) 50%, rgba(6, 182, 212, 0.02) 100%)",
    pointerEvents: "none",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    position: "relative" as const,
    zIndex: 1,
  },

  /* Search */
  searchWrapper: {
    position: "relative" as const,
    width: "100%",
    maxWidth: "480px",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    height: "44px",
    borderRadius: "14px",
    border: "1.5px solid rgba(24, 119, 242, 0.15)",
    background: "rgba(24, 119, 242, 0.04)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  searchContainerFocused: {
    borderColor: "rgba(24, 119, 242, 0.5)",
    background: "#ffffff",
    boxShadow: "0 0 0 4px rgba(24, 119, 242, 0.1), 0 4px 16px rgba(24, 119, 242, 0.08), inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  searchIconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "14px 0 0 14px",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "13px",
    fontWeight: 500,
    color: "#1c1e21",
    fontFamily: "inherit",
    paddingRight: "12px",
  },
  searchLoader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    flexShrink: 0,
  },

  /* Dropdown */
  searchDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid rgba(24, 119, 242, 0.12)",
    borderRadius: "14px",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)",
    maxHeight: "320px",
    overflowY: "auto" as const,
    zIndex: 50,
  },
  searchingText: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 16px",
    fontSize: "13px",
    color: "#65676b",
  },
  searchingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#1877f2",
    display: "inline-block",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  searchResultItem: {
    width: "100%",
    textAlign: "left" as const,
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(24, 119, 242, 0.05)",
    cursor: "pointer",
    transition: "background 0.15s ease",
    fontFamily: "inherit",
  },
  resultName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#1c1e21",
    marginBottom: "3px",
  },
  resultMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  resultBadge: {
    fontSize: "11px",
    color: "#65676b",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  noResults: {
    padding: "14px 16px",
    fontSize: "13px",
    color: "#65676b",
    textAlign: "center" as const,
  },
};