"use client";

import React, { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users, Package, TrendingUp, AlertTriangle, Activity, Shield } from "lucide-react";
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
      return {
        totalPatients: patients.count || 0,
        totalItems: items.count || 0,
        supplyToday: supplyToday.count || 0,
        expiringSoon: expiringBatches.count || 0,
      };
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
      delay: 0.15,
    },
    {
      title: "Bekalan Hari Ini",
      value: stats?.supplyToday ?? 0,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      glowColor: "rgba(124, 58, 237, 0.3)",
      subtitle: "Rekod bekalan hari ini",
      delay: 0.3,
    },
    {
      title: "Akan Luput (30 Hari)",
      value: stats?.expiringSoon ?? 0,
      icon: AlertTriangle,
      gradient: "linear-gradient(135deg, #ea580c, #f97316)",
      glowColor: "rgba(234, 88, 12, 0.3)",
      subtitle: "Kelompok akan tamat tempoh",
      delay: 0.45,
    },
  ];

  return (
    <div style={styles.pageWrapper}>
      {/* Background decoration */}
      <div style={styles.bgDecoration} />
      <div style={styles.bgGrid} />

      {/* Header */}
      <motion.div
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
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
          >
            <Activity size={20} color="white" />
          </motion.div>
          <div>
            <motion.h1
              style={styles.headerTitle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              Selamat Datang, {profile?.nama}
            </motion.h1>
            <motion.p
              style={styles.headerSubtitle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              Papan Pemuka Sistem Pengurusan Inventori & Pesakit
            </motion.p>
          </div>
        </div>
        <motion.div
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
      <div style={styles.grid}>
        {statCards.map((card, idx) => (
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
              {/* Background gradient */}
              <div style={{ ...styles.statCardBg, background: card.gradient }} />

              {/* Decorative circle */}
              <div style={styles.statCardCircle1} />
              <div style={styles.statCardCircle2} />

              {/* Glow on hover */}
              <div style={{ ...styles.statCardGlow, boxShadow: `0 0 60px ${card.glowColor}` }} />

              {/* Content */}
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
                    delay: 0.4 + card.delay,
                  }}
                >
                  <card.icon size={24} color="white" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Info Section */}
      <motion.div
        style={styles.infoSection}
        initial={{ opacity: 0, y: 30 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <div style={styles.infoCard}>
          <div style={styles.infoCardBorder} />
          <div style={styles.infoCardInner}>
            <div style={styles.infoCardHeader}>
              <Shield size={18} color="#60a5fa" />
              <span style={styles.infoCardTitle}>Ringkasan Sistem</span>
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoItemLabel}>Pesakit Aktif</div>
                <div style={styles.infoItemValue}>{stats?.totalPatients ?? "—"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoItemLabel}>Item Didaftarkan</div>
                <div style={styles.infoItemValue}>{stats?.totalItems ?? "—"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoItemLabel}>Bekalan Hari Ini</div>
                <div style={styles.infoItemValue}>{stats?.supplyToday ?? "—"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoItemLabel}>Perlu Tindakan</div>
                <div style={{ ...styles.infoItemValue, color: (stats?.expiringSoon ?? 0) > 0 ? "#f97316" : "#22c55e" }}>
                  {stats?.expiringSoon ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @-webkit-keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @-webkit-keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .dashboard-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "28px",
    position: "relative" as const,
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
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

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "28px",
    position: "relative" as const,
    zIndex: 1,
  },

  /* Stat Cards */
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

  /* Info Section */
  infoSection: {
    position: "relative" as const,
    zIndex: 1,
  },
  infoCard: {
    position: "relative",
    borderRadius: "16px",
  },
  infoCardBorder: {
    position: "absolute",
    inset: 0,
    borderRadius: "16px",
    padding: "1px",
    background: "linear-gradient(135deg, rgba(24, 119, 242, 0.2), rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.1))",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as any,
    maskComposite: "exclude" as any,
    pointerEvents: "none" as const,
  },
  infoCardInner: {
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.85)",
    WebkitBackdropFilter: "blur(12px)",
    backdropFilter: "blur(12px)",
    padding: "22px 24px",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
  },
  infoCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "18px",
  },
  infoCardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1c1e21",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  infoItem: {
    padding: "14px 16px",
    borderRadius: "10px",
    background: "rgba(240, 242, 245, 0.6)",
    border: "1px solid rgba(221, 223, 226, 0.5)",
  },
  infoItemLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#65676b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: "6px",
  },
  infoItemValue: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#1c1e21",
    letterSpacing: "-0.01em",
  },
};