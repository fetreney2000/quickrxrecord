"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, HelpCircle, KeyRound, CheckCircle2 } from "lucide-react";

/* ── Animated Background Orbs (same as login) ────────────────────── */
function BackgroundOrbs() {
  return (
    <div style={styles.orbContainer}>
      <motion.div
        style={styles.orbPrimary}
        animate={{ x: [0, 80, -40, 60, 0], y: [0, -60, 40, -20, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={styles.orbSecondary}
        animate={{ x: [0, -60, 50, -30, 0], y: [0, 50, -40, 30, 0], scale: [1, 0.9, 1.15, 1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={styles.orbAccent}
        animate={{ x: [0, 40, -60, 20, 0], y: [0, -30, 60, -50, 0], scale: [1, 1.2, 0.85, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ── Floating Particles ──────────────────────────────────────────── */
function FloatingParticles() {
  return (
    <div style={styles.particleContainer}>
      {particleData.map((p, i) => (
        <div
          key={i}
          style={{
            ...styles.particle,
            left: p.left, top: p.top, width: p.size, height: p.size,
            animationDelay: p.delay, animationDuration: p.duration, opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

const particleData = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 19 + 7) % 100}%`,
  top: `${(i * 23 + 12) % 100}%`,
  size: (i % 4) * 2 + 3,
  delay: `${(i * 0.8) % 5}s`,
  duration: `${8 + (i % 4) * 3}s`,
  opacity: 0.12 + (i % 3) * 0.08,
}));

/* ── Success State ───────────────────────────────────────────────── */
function SuccessState({ mounted }: { mounted: boolean }) {
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.bgGradient} />
      <div style={styles.meshOverlay} />
      <BackgroundOrbs />
      <FloatingParticles />
      <div style={styles.gridPattern} />

      <div style={styles.contentWrapper}>
        <motion.div
          style={styles.cardOuter}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div style={styles.cardBorderGradient} />
          <div style={styles.cardInner}>
            <div style={styles.accentBarSuccess} />
            <div style={styles.cardContent}>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
                style={styles.successIconWrapper}
              >
                <div style={styles.successIconGlow} />
                <div style={styles.successIcon}>
                  <CheckCircle2 size={32} color="white" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={styles.welcomeTitle}
              >
                Permintaan Dihantar
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={styles.welcomeSubtitle}
              >
                Permintaan reset kata laluan anda telah dihantar kepada pentadbir. Anda akan dimaklumkan apabila kata laluan anda telah ditetapkan semula.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.7, duration: 0.5 }}
                style={{ marginTop: "28px" }}
              >
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <button
                    style={styles.submitButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(24, 119, 242, 0.35), 0 4px 10px rgba(24, 119, 242, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(24, 119, 242, 0.25), 0 2px 6px rgba(24, 119, 242, 0.15)";
                    }}
                  >
                    <ArrowLeft size={18} />
                    <span>Kembali ke Log Masuk</span>
                  </button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        style={styles.footer}
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <p style={styles.footerText}>&copy; {new Date().getFullYear()} QuickRxRecord. Hak cipta terpelihara.</p>
      </motion.div>

      <style>{`
        @-webkit-keyframes floatParticle {
          0%, 100% { -webkit-transform: translateY(0) translateX(0); transform: translateY(0) translateX(0); }
          25% { -webkit-transform: translateY(-20px) translateX(10px); transform: translateY(-20px) translateX(10px); }
          50% { -webkit-transform: translateY(-8px) translateX(-8px); transform: translateY(-8px) translateX(-8px); }
          75% { -webkit-transform: translateY(-25px) translateX(5px); transform: translateY(-25px) translateX(5px); }
        }
        @keyframes floatParticle {
          0%, 100% { -webkit-transform: translateY(0) translateX(0); transform: translateY(0) translateX(0); }
          25% { -webkit-transform: translateY(-20px) translateX(10px); transform: translateY(-20px) translateX(10px); }
          50% { -webkit-transform: translateY(-8px) translateX(-8px); transform: translateY(-8px) translateX(-8px); }
          75% { -webkit-transform: translateY(-25px) translateX(5px); transform: translateY(-25px) translateX(5px); }
        }
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
      `}</style>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function LupaKataLaluanPage() {
  const [nama_pengguna, setNamaPengguna] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama_pengguna) {
      toast.error("Sila masukkan nama pengguna anda.");
      return;
    }
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nama_pengguna")
        .eq("nama_pengguna", nama_pengguna)
        .single();

      if (error || !profiles) {
        toast.error("Nama pengguna tidak dijumpai.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profiles.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setSent(true);
          setLoading(false);
          return;
        }
        toast.error(data.error || "Gagal menghantar permintaan.");
      } else {
        setSent(true);
      }
    } catch {
      toast.error("Ralat semasa memproses permintaan.");
    }
    setLoading(false);
  };

  if (sent) {
    return <SuccessState mounted={mounted} />;
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.bgGradient} />
      <div style={styles.meshOverlay} />
      <BackgroundOrbs />
      <FloatingParticles />
      <div style={styles.gridPattern} />

      <div style={styles.contentWrapper}>
        <motion.div
          style={styles.cardOuter}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div style={styles.cardBorderGradient} />
          <div style={styles.cardInner}>
            <div style={styles.accentBar} />
            <div style={styles.cardContent}>
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.15, duration: 0.5, type: "spring" }}
                style={styles.logoWrapper}
              >
                <motion.div
                  style={styles.logoGlow}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div style={styles.logoIcon}>
                  <KeyRound size={32} color="white" />
                </div>
              </motion.div>

              {/* Welcome text */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={styles.welcomeSection}
              >
                <h3 style={styles.welcomeTitle}>Lupa Kata Laluan?</h3>
                <p style={styles.welcomeSubtitle}>
                  Masukkan nama pengguna anda. Permintaan akan dihantar kepada pentadbir.
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  style={styles.fieldGroup}
                >
                  <Label style={styles.fieldLabel}>
                    <HelpCircle
                      size={14}
                      style={{ color: focusedField ? "#1877f2" : "#9ca3af", transition: "color 0.2s" }}
                    />
                    Nama Pengguna
                  </Label>
                  <Input
                    value={nama_pengguna}
                    onChange={(e) => setNamaPengguna(e.target.value)}
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    className={focusedField ? "ring-2 ring-primary/20 border-primary/50" : ""}
                    style={{
                      ...styles.input,
                      borderColor: focusedField ? "rgba(24, 119, 242, 0.5)" : "rgba(255, 255, 255, 0.1)",
                      boxShadow: focusedField
                        ? "0 0 0 3px rgba(24, 119, 242, 0.1), 0 2px 8px rgba(24, 119, 242, 0.08)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    placeholder="Masukkan nama pengguna"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  style={{ marginTop: "28px" }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ ...styles.submitButton, opacity: loading ? 0.8 : 1 }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 8px 25px rgba(24, 119, 242, 0.35), 0 4px 10px rgba(24, 119, 242, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(24, 119, 242, 0.25), 0 2px 6px rgba(24, 119, 242, 0.15)";
                    }}
                  >
                    {loading ? (
                      <span style={styles.buttonContent}>
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                        <span>Menghantar...</span>
                      </span>
                    ) : (
                      <span style={styles.buttonContent}>
                        <span>Hantar Permintaan</span>
                      </span>
                    )}
                  </button>
                </motion.div>
              </form>

              {/* Back to login */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={mounted ? { opacity: 1 } : {}}
                transition={{ delay: 0.7, duration: 0.5 }}
                style={styles.forgotSection}
              >
                <Link href="/login" style={styles.forgotLink}>
                  <ArrowLeft size={14} />
                  <span>Kembali ke Log Masuk</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        style={styles.footer}
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <p style={styles.footerText}>&copy; {new Date().getFullYear()} QuickRxRecord. Hak cipta terpelihara.</p>
      </motion.div>

      <style>{`
        @-webkit-keyframes spin {
          from { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
          to { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
        }
        @keyframes spin {
          from { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
          to { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
        }
        @-webkit-keyframes floatParticle {
          0%, 100% { -webkit-transform: translateY(0) translateX(0); transform: translateY(0) translateX(0); }
          25% { -webkit-transform: translateY(-20px) translateX(10px); transform: translateY(-20px) translateX(10px); }
          50% { -webkit-transform: translateY(-8px) translateX(-8px); transform: translateY(-8px) translateX(-8px); }
          75% { -webkit-transform: translateY(-25px) translateX(5px); transform: translateY(-25px) translateX(5px); }
        }
        @keyframes floatParticle {
          0%, 100% { -webkit-transform: translateY(0) translateX(0); transform: translateY(0) translateX(0); }
          25% { -webkit-transform: translateY(-20px) translateX(10px); transform: translateY(-20px) translateX(10px); }
          50% { -webkit-transform: translateY(-8px) translateX(-8px); transform: translateY(-8px) translateX(-8px); }
          75% { -webkit-transform: translateY(-25px) translateX(5px); transform: translateY(-25px) translateX(5px); }
        }
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
      `}</style>
    </div>
  );
}

/* ── Style Objects (Chrome 109 compatible) ───────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    position: "relative", minHeight: "100vh", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "16px", overflow: "hidden", background: "#0a0e27",
  },
  bgGradient: {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, #0a0e27 0%, #1a1145 25%, #0d1b3e 50%, #0a1628 75%, #0a0e27 100%)",
    backgroundSize: "400% 400%", animation: "gradientShift 15s ease infinite",
  },
  meshOverlay: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 20% 50%, rgba(24, 119, 242, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
  },
  gridPattern: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
  },
  orbContainer: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" },
  orbPrimary: {
    position: "absolute", width: "500px", height: "500px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(24, 119, 242, 0.2) 0%, rgba(24, 119, 242, 0.05) 50%, transparent 70%)",
    filter: "blur(60px)", top: "-10%", left: "-5%",
  },
  orbSecondary: {
    position: "absolute", width: "450px", height: "450px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0.04) 50%, transparent 70%)",
    filter: "blur(60px)", top: "50%", right: "-10%",
  },
  orbAccent: {
    position: "absolute", width: "350px", height: "350px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.03) 50%, transparent 70%)",
    filter: "blur(50px)", bottom: "-5%", left: "30%",
  },
  particleContainer: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" },
  particle: {
    position: "absolute", borderRadius: "50%", background: "rgba(255, 255, 255, 0.2)",
    animation: "floatParticle 8s ease-in-out infinite",
  },
  contentWrapper: {
    position: "relative", zIndex: 10, width: "100%", maxWidth: "440px",
    display: "flex", alignItems: "center",
  },
  cardOuter: { position: "relative", width: "100%" },
  cardBorderGradient: {
    position: "absolute", inset: 0, borderRadius: "20px", padding: "1px",
    background: "linear-gradient(135deg, rgba(24, 119, 242, 0.4), rgba(124, 58, 237, 0.3), rgba(6, 182, 212, 0.2), rgba(24, 119, 242, 0.1))",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as any, maskComposite: "exclude" as any, pointerEvents: "none" as const,
  },
  cardInner: {
    position: "relative", borderRadius: "20px", background: "rgba(255, 255, 255, 0.07)",
    WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  accentBar: {
    height: "3px", background: "linear-gradient(90deg, #1877f2, #7c3aed, #06b6d4, #1877f2)",
    backgroundSize: "200% 100%", animation: "gradientShift 4s ease infinite",
  },
  accentBarSuccess: {
    height: "3px", background: "linear-gradient(90deg, #22c55e, #06b6d4, #22c55e)",
    backgroundSize: "200% 100%", animation: "gradientShift 4s ease infinite",
  },
  cardContent: { padding: "36px 32px 32px" },
  logoWrapper: {
    position: "relative", width: "72px", height: "72px",
    margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoGlow: {
    position: "absolute", inset: "-12px", borderRadius: "20px",
    background: "radial-gradient(circle, rgba(24, 119, 242, 0.4) 0%, transparent 70%)", filter: "blur(16px)",
  },
  logoIcon: {
    position: "relative", width: "72px", height: "72px",
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "18px", background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    boxShadow: "0 8px 24px rgba(24, 119, 242, 0.35), 0 4px 8px rgba(24, 119, 242, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  },
  successIconWrapper: {
    position: "relative", width: "80px", height: "80px",
    margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
  },
  successIconGlow: {
    position: "absolute", inset: "-12px", borderRadius: "20px",
    background: "radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)", filter: "blur(16px)",
  },
  successIcon: {
    position: "relative", width: "80px", height: "80px",
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "20px", background: "linear-gradient(135deg, #22c55e, #16a34a)",
    boxShadow: "0 8px 24px rgba(34, 197, 94, 0.35), 0 4px 8px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  },
  welcomeSection: { marginBottom: "28px", textAlign: "center" as const },
  welcomeTitle: { fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" },
  welcomeSubtitle: { fontSize: "14px", color: "rgba(255, 255, 255, 0.45)", lineHeight: 1.6 },
  fieldGroup: { marginBottom: "20px" },
  fieldLabel: {
    display: "flex", alignItems: "center", gap: "6px", fontSize: "13px",
    fontWeight: 600, color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px",
  },
  input: {
    width: "100%", height: "48px", padding: "0 16px", borderRadius: "12px",
    border: "1.5px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff", fontSize: "14px", fontFamily: "inherit", outline: "none",
    transition: "all 0.2s ease", WebkitAppearance: "none" as any,
    boxSizing: "border-box" as const,
  },
  submitButton: {
    width: "100%", height: "50px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)", color: "#ffffff",
    fontSize: "15px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 15px rgba(24, 119, 242, 0.25), 0 2px 6px rgba(24, 119, 242, 0.15)",
    letterSpacing: "0.02em",
  },
  buttonContent: { display: "flex", alignItems: "center", gap: "8px" },
  forgotSection: { marginTop: "24px", textAlign: "center" as const },
  forgotLink: {
    display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px",
    color: "rgba(255, 255, 255, 0.4)", textDecoration: "none", transition: "color 0.2s",
  },
  footer: { position: "relative", zIndex: 10, marginTop: "32px" },
  footerText: { fontSize: "12px", color: "rgba(255, 255, 255, 0.25)", textAlign: "center" as const },
};