"use client";

import React, { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users, Package, TrendingUp, AlertTriangle, Activity, Calendar, Clock } from "lucide-react";
import { motion, useInView } from "framer-motion";

/* ── Animated Counter ────────────────────────────────────────────── */
function AnimatedNumber({ value, duration = 2 }: { value: number | string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const num = typeof value === "number" ? value : parseInt(value) || 0;

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "inline-block" }}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <CountingNumber to={num} duration={duration} />
        </motion.span>
      ) : "0"}
    </motion.span>
  );
}

function CountingNumber({ to, duration }: { to: number; duration: number }) {
  const [count, setCount] = React.useState(0);
  const ref = useRef<number>(0);
  const startTime = useRef<number>(0);

  React.useEffect(() => {
    if (to === 0) { setCount(0); return; }
    startTime.current = performance.now();
    ref.current = requestAnimationFrame(function animate(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * to));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(ref.current);
  }, [to, duration]);

  return <>{count.toLocaleString()}</>;
}

/* ── Dashboard Page ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [patients, items, supplyToday, expiringBatches] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("aktif", true).is("merged_into", null),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("aktif", true),
        supabase.from("supply_records").select("id", { count: "exact", head: true })
          .gte("tarikh_dibekal", new Date().toISOString().split("T")[0]),
        supabase.from("item_batches").select("id", { count: "exact", head: true })
          .lt("tarikh_luput", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .gt("kuantiti", 0),
      ]);

      // Fetch items with batches for stock calculation
      const { data: itemsWithBatches } = await supabase
        .from("items")
        .select("kuota, item_batches(kuantiti)")
        .eq("aktif", true);

      let totalStock = 0;
      let lowStockCount = 0;
      for (const item of (itemsWithBatches || []) as any[]) {
        const itemStock = item.item_batches?.reduce((s: number, b: any) => s + (b.kuantiti || 0), 0) || 0;
        totalStock += itemStock;
        if (item.kuota && itemStock < item.kuota) lowStockCount++;
      }

      return {
        totalPatients: patients.count || 0,
        totalItems: items.count || 0,
        supplyToday: supplyToday.count || 0,
        expiringSoon: expiringBatches.count || 0,
        totalStock,
        lowStockCount,
      };
    },
  });

  const { data: expiryItems } = useQuery({
    queryKey: ["expiry-dashboard"],
    queryFn: async () => {
      const { data: batches } = await supabase
        .from("item_batches")
        .select("nombor_kelompok, tarikh_luput, kuantiti, item_id, items(nama_item, kekuatan, kod_item)")
        .gt("kuantiti", 0)
        .order("tarikh_luput", { ascending: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (batches || []).map((b: any) => {
        const expiry = new Date(b.tarikh_luput);
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let urgency: "critical" | "warning" | "safe";
        if (daysLeft < 0) urgency = "critical";
        else if (daysLeft <= 30) urgency = "critical";
        else if (daysLeft <= 90) urgency = "warning";
        else urgency = "safe";
        return { ...b, daysLeft, urgency };
      });
    },
  });

  const statCards = [
    {
      title: "Pesakit Aktif",
      value: stats?.totalPatients ?? 0,
      icon: Users,
      gradient: "linear-gradient(135deg, #2563eb, #3b82f6)",
      glowColor: "rgba(37, 99, 235, 0.3)",
      subtitle: "Jumlah pesakit dalam sistem",
      delay: 0,
    },
    {
      title: "Item Ubatan",
      value: stats?.totalItems ?? 0,
      icon: Package,
      gradient: "linear-gradient(135deg, #059669, #10b981)",
      glowColor: "rgba(5, 150, 105, 0.3)",
      subtitle: "Item ubat didaftarkan",
      delay: 0.03,
    },
    {
      title: "Bekalan Hari Ini",
      value: stats?.supplyToday ?? 0,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      glowColor: "rgba(124, 58, 237, 0.3)",
      subtitle: "Rekod bekalan hari ini",
      delay: 0.08,
    },
    {
      title: "Akan Luput (30 Hari)",
      value: stats?.expiringSoon ?? 0,
      icon: AlertTriangle,
      gradient: "linear-gradient(135deg, #ea580c, #f97316)",
      glowColor: "rgba(234, 88, 12, 0.3)",
      subtitle: "Kelompok akan tamat tempoh",
      delay: 0.03,
    },
    {
      title: "Jumlah Stok",
      value: stats?.totalStock ?? 0,
      icon: Package,
      gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
      glowColor: "rgba(8, 145, 178, 0.3)",
      subtitle: "Unit stok keseluruhan",
      delay: 0.6,
    },
    {
      title: "Stok Rendah",
      value: stats?.lowStockCount ?? 0,
      icon: AlertTriangle,
      gradient: "linear-gradient(135deg, #dc2626, #ef4444)",
      glowColor: "rgba(220, 38, 38, 0.3)",
      subtitle: "Item di bawah kuota",
      delay: 0.75,
    },
  ];

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.bgDecoration} />
      <div style={styles.bgGrid} />

      {/* Header */}
      <motion.div
        className="dash-header"
        style={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div style={styles.headerLeft}>
          <motion.div
            style={styles.headerIcon}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.02 }}
          >
            <Activity size={20} color="white" />
          </motion.div>
          <div>
            <motion.h1
              style={styles.headerTitle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03, duration: 0.4 }}
            >
              Selamat Datang, {profile?.nama}
            </motion.h1>
            <motion.p
              style={styles.headerSubtitle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08, duration: 0.4 }}
            >
              Papan Pemuka QuickRxRecord v4
            </motion.p>
          </div>
        </div>
        <motion.div
          className="dash-status"
          style={styles.statusBadge}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <motion.div
            style={styles.statusDot}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={styles.statusText}>Sistem Beroperasi</span>
        </motion.div>
      </motion.div>

      {/* Stat Cards */}
      <div className="dash-grid" style={styles.grid}>
        {statCards.map((card) => (
          <motion.div
            key={card.title}
            style={styles.statCardOuter}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{
              delay: 0.2 + card.delay,
              duration: 0.6,
              type: "spring",
              damping: 20,
              stiffness: 100,
            }}
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
          >
            <div style={styles.statCardInner}>
              <div style={{ ...styles.statCardBg, background: card.gradient }} />
              <div style={styles.statCardCircle1} />
              <div style={styles.statCardCircle2} />
              <div style={{ ...styles.statCardGlow, boxShadow: "0 0 60px " + card.glowColor }} />
              <div style={styles.statCardContent}>
                <div style={styles.statCardText}>
                  <p style={styles.statCardTitle}>{card.title}</p>
                  <div style={styles.statCardValue}>
                    <AnimatedNumber value={card.value} duration={1.5} />
                  </div>
                  <p style={styles.statCardSubtitle}>{card.subtitle}</p>
                </div>
                <motion.div
                  style={styles.statCardIcon}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={mounted ? { scale: 1, rotate: 0 } : {}}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 200,
                    delay: 0.02 + card.delay,
                  }}
                >
                  <card.icon size={24} color="white" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expiry Dashboard */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "linear-gradient(135deg, #ea580c, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)" }}>
            <Calendar size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1c1e21", lineHeight: 1.3 }}>Papan Pemuka Luput</h2>
            <p style={{ fontSize: "11px", color: "#65676b" }}>Pantau kelompok ubat yang akan tamat tempoh</p>
          </div>
        </div>

        {/* Color-coded summary badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "Kritikal (<30 Hari)", color: "#dc2626", bg: "rgba(220, 38, 38, 0.08)", border: "rgba(220, 38, 38, 0.2)", count: (expiryItems || []).filter((e: any) => e.urgency === "critical").length },
            { label: "Amaran (30-90 Hari)", color: "#ea580c", bg: "rgba(234, 88, 12, 0.08)", border: "rgba(234, 88, 12, 0.2)", count: (expiryItems || []).filter((e: any) => e.urgency === "warning").length },
            { label: "Selamat (>90 Hari)", color: "#16a34a", bg: "rgba(22, 163, 74, 0.06)", border: "rgba(22, 163, 74, 0.15)", count: (expiryItems || []).filter((e: any) => e.urgency === "safe").length },
          ].map(cat => (
            <div key={cat.label} style={{
              padding: "10px 16px", borderRadius: "12px",
              background: cat.bg, border: `1px solid ${cat.border}`,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color }} />
              <span style={{ fontSize: "12px", color: cat.color, fontWeight: 600 }}>{cat.label}</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: cat.color }}>{cat.count}</span>
            </div>
          ))}
        </div>

        {/* Expiry table */}
        <div style={{ borderRadius: "14px", border: "1px solid rgba(0,0,0,0.06)", background: "#ffffff", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Nama Item</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Kelompok</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Tarikh Luput</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Stok</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Hari</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "#65676b", fontSize: "11px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(expiryItems || []).slice(0, 50).map((item: any, idx: number) => {
                  const urgencyColors: Record<string, { bg: string; text: string; dot: string }> = {
                    critical: { bg: "rgba(220, 38, 38, 0.06)", text: "#dc2626", dot: "#dc2626" },
                    warning: { bg: "rgba(234, 88, 12, 0.04)", text: "#ea580c", dot: "#ea580c" },
                    safe: { bg: "rgba(22, 163, 74, 0.03)", text: "#16a34a", dot: "#16a34a" },
                  };
                  const c = urgencyColors[item.urgency];
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: c.bg }}>
                      <td style={{ padding: "8px 14px", fontSize: "12px", fontWeight: 500, color: "#1c1e21" }}>
                        {item.items?.nama_item || "-"} {item.items?.kekuatan && <span style={{ fontSize: "10px", color: "#65676b" }}>{item.items.kekuatan}</span>}
                        <div style={{ fontSize: "10px", color: "#9ca3af" }}>{item.items?.kod_item}</div>
                      </td>
                      <td style={{ padding: "8px 14px", fontFamily: "monospace", fontSize: "11px", color: "#374151" }}>{item.nombor_kelompok}</td>
                      <td style={{ padding: "8px 14px", fontSize: "11px", color: "#374151" }}>{item.tarikh_luput}</td>
                      <td style={{ padding: "8px 14px", textAlign: "center", fontSize: "11px", fontWeight: 500, color: "#374151" }}>{item.kuantiti}</td>
                      <td style={{ padding: "8px 14px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: c.text }}>
                        {item.daysLeft < 0 ? "Luput" : item.daysLeft}
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.dot }} />
                          <span style={{ fontSize: "10px", fontWeight: 600, color: c.text }}>
                            {item.urgency === "critical" ? "Kritikal" : item.urgency === "warning" ? "Amaran" : "Selamat"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!expiryItems || expiryItems.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "#9ca3af" }}>
                      Tiada kelompok ubat ditemui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dash-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .dash-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .dash-status {
            align-self: flex-start !important;
          }
        }
        @media (max-width: 480px) {
          .dash-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Styles (Chrome 109 compatible) ──────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    position: "relative",
    overflow: "hidden",
  },
  bgDecoration: {
    position: "absolute",
    top: "-100px",
    right: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(24, 119, 242, 0.04) 0%, transparent 70%)",
    filter: "blur(40px)",
    pointerEvents: "none",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    position: "relative" as const,
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  headerIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(24, 119, 242, 0.3)",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1c1e21",
    letterSpacing: "-0.01em",
    marginBottom: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  headerSubtitle: {
    fontSize: "13px",
    color: "#65676b",
    fontWeight: 500,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "10px",
    background: "rgba(34, 197, 94, 0.06)",
    border: "1px solid rgba(34, 197, 94, 0.15)",
    flexShrink: 0,
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22c55e",
  },
  statusText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#65676b",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    position: "relative" as const,
    zIndex: 1,
  },
  statCardOuter: {
    cursor: "default",
  },
  statCardInner: {
    position: "relative",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.3s ease",
  },
  statCardBg: {
    position: "absolute",
    inset: 0,
  },
  statCardCircle1: {
    position: "absolute",
    top: "-20px",
    right: "-20px",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.1)",
  },
  statCardCircle2: {
    position: "absolute",
    bottom: "-30px",
    left: "-15px",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.06)",
  },
  statCardGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: "16px",
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  statCardContent: {
    position: "relative",
    zIndex: 2,
    padding: "22px 20px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statCardText: {
    flex: 1,
    minWidth: 0,
  },
  statCardTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "8px",
  },
  statCardValue: {
    fontSize: "30px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginBottom: "6px",
  },
  statCardSubtitle: {
    fontSize: "10px",
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: 500,
  },
  statCardIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};