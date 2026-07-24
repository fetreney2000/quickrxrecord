"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Sun, Moon, Bell, AlertTriangle, Package, Calendar } from "lucide-react";
import type { Patient } from "@/types";
import { formatDate } from "@/lib/utils";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── Notification Center Queries ─────────────────────────────── */
  const { data: notifications } = useQuery({
    queryKey: ["header-notifications"],
    queryFn: async () => {
      const alerts: { id: string; type: "expiry" | "low_stock"; message: string; detail: string; urgency: "critical" | "warning" }[] = [];

      // Low stock alerts
      const { data: items } = await supabase
        .from("items")
        .select("id, nama_item, kuota, item_batches(kuantiti)")
        .eq("aktif", true);

      for (const item of (items || []) as any[]) {
        const totalStock = item.item_batches?.reduce((s: number, b: any) => s + (b.kuantiti || 0), 0) || 0;
        if (item.kuota && totalStock < item.kuota) {
          alerts.push({
            id: `low-${item.id}`,
            type: "low_stock",
            message: `Stok rendah: ${item.nama_item}`,
            detail: `${totalStock} unit (kuota: ${item.kuota})`,
            urgency: "warning",
          });
        }
      }

      // Expiry alerts (within 30 days)
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: expiring } = await supabase
        .from("item_batches")
        .select("id, nombor_kelompok, tarikh_luput, kuantiti, items!inner(nama_item)")
        .lt("tarikh_luput", thirtyDays)
        .gt("kuantiti", 0)
        .order("tarikh_luput", { ascending: true })
        .limit(20);

      for (const b of (expiring || []) as any[]) {
        alerts.push({
          id: `exp-${b.id}`,
          type: "expiry",
          message: `Akan luput: ${b.items?.nama_item}`,
          detail: `Kelompok ${b.nombor_kelompok} luput ${b.tarikh_luput} (${b.kuantiti} unit)`,
          urgency: "critical",
        });
      }

      // Sort: critical first
      alerts.sort((a, b) => (a.urgency === "critical" ? -1 : 1));
      return alerts.slice(0, 20);
    },
    staleTime: 60_000,
  });

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
      {/* Animated orbs */}
      <div style={styles.orbContainer}>
        <div style={{ ...styles.headerOrb, width: "200px", height: "200px", top: "-60px", left: "10%", background: "radial-gradient(circle, rgba(24,119,242,0.06) 0%, transparent 70%)", animation: "headerOrbFloat1 12s ease-in-out infinite" }} />
        <div style={{ ...styles.headerOrb, width: "160px", height: "160px", top: "-40px", right: "20%", background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)", animation: "headerOrbFloat2 15s ease-in-out infinite" }} />
        <div style={{ ...styles.headerOrb, width: "120px", height: "120px", top: "-30px", left: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)", animation: "headerOrbFloat3 18s ease-in-out infinite" }} />
      </div>

      <div style={styles.headerInner}>
        {/* Left spacer */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Dark mode toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Tukar ke mod terang" : "Tukar ke mod gelap"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "36px", height: "36px", borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)", background: "transparent",
                cursor: "pointer", transition: "all 0.2s ease", color: "#65676b",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.color = "#1c1e21"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#65676b"; }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>

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

        {/* Right spacer with notification bell */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
          {/* Notification bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Pusat Notifikasi"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "36px", height: "36px", borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)", background: showNotifications ? "rgba(24,119,242,0.06)" : "transparent",
                cursor: "pointer", transition: "all 0.2s ease", color: showNotifications ? "#1877f2" : "#65676b",
                position: "relative",
              }}
              onMouseEnter={(e) => { if (!showNotifications) { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.color = "#1c1e21"; } }}
              onMouseLeave={(e) => { if (!showNotifications) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#65676b"; } }}
            >
              <Bell size={16} />
              {notifications && notifications.length > 0 && (
                <span style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: notifications.some(n => n.urgency === "critical") ? "#ef4444" : "#f59e0b",
                  border: "1.5px solid #ffffff",
                }} />
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 48 }} onClick={() => setShowNotifications(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  width: "380px", maxHeight: "480px", overflowY: "auto",
                  background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                  zIndex: 50, padding: "4px",
                }}>
                  <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1c1e21" }}>Pusat Notifikasi</span>
                      {notifications && (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#65676b", background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: "8px" }}>
                          {notifications.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "10px",
                          padding: "10px 14px", borderRadius: "10px",
                          cursor: "pointer", transition: "background 0.15s ease",
                          margin: "2px 0",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "9px",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          background: n.type === "expiry" ? "rgba(234, 88, 12, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        }}>
                          {n.type === "expiry" ? <Calendar size={14} color="#ea580c" /> : <Package size={14} color="#d97706" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: n.urgency === "critical" ? "#dc2626" : "#1c1e21" }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: "11px", color: "#65676b", marginTop: "1px" }}>
                            {n.detail}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "32px 16px", textAlign: "center" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                        <AlertTriangle size={16} color="#22c55e" />
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#1c1e21" }}>Tiada Notifikasi</div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>Semua terkawal — tiada isu dikesan.</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @-webkit-keyframes headerOrbFloat1 {
          0%, 100% { -webkit-transform: translateX(0) translateY(0); transform: translateX(0) translateY(0); }
          50% { -webkit-transform: translateX(30px) translateY(10px); transform: translateX(30px) translateY(10px); }
        }
        @keyframes headerOrbFloat1 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(30px) translateY(10px); }
        }
        @-webkit-keyframes headerOrbFloat2 {
          0%, 100% { -webkit-transform: translateX(0) translateY(0); transform: translateX(0) translateY(0); }
          50% { -webkit-transform: translateX(-20px) translateY(8px); transform: translateX(-20px) translateY(8px); }
        }
        @keyframes headerOrbFloat2 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-20px) translateY(8px); }
        }
        @-webkit-keyframes headerOrbFloat3 {
          0%, 100% { -webkit-transform: translateX(0) translateY(0); transform: translateX(0) translateY(0); }
          50% { -webkit-transform: translateX(15px) translateY(-5px); transform: translateX(15px) translateY(-5px); }
        }
        @keyframes headerOrbFloat3 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(15px) translateY(-5px); }
        }
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
    overflow: "visible",
  },
  headerBg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, rgba(24, 119, 242, 0.03) 0%, rgba(124, 58, 237, 0.02) 50%, rgba(6, 182, 212, 0.02) 100%)",
    pointerEvents: "none",
  },
  orbContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  headerOrb: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(30px)",
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