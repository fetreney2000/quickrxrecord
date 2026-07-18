"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";

/* ── Animated Background Orbs ────────────────────────────────────── */
function BackgroundOrbs() {
  return (
    <div style={styles.orbContainer}>
      {/* Large primary orb */}
      <motion.div
        style={styles.orbPrimary}
        animate={{
          x: [0, 80, -40, 60, 0],
          y: [0, -60, 40, -20, 0],
          scale: [1, 1.1, 0.95, 1.05, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary purple orb */}
      <motion.div
        style={styles.orbSecondary}
        animate={{
          x: [0, -60, 50, -30, 0],
          y: [0, 50, -40, 30, 0],
          scale: [1, 0.9, 1.15, 1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Teal accent orb */}
      <motion.div
        style={styles.orbAccent}
        animate={{
          x: [0, 40, -60, 20, 0],
          y: [0, -30, 60, -50, 0],
          scale: [1, 1.2, 0.85, 1.1, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Small warm orb */}
      <motion.div
        style={styles.orbWarm}
        animate={{
          x: [0, -30, 40, -20, 0],
          y: [0, 40, -20, 50, 0],
          scale: [1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ── Floating Particles (pure CSS animation for compat) ─────────── */
function FloatingParticles() {
  return (
    <div style={styles.particleContainer}>
      {particleData.map((p, i) => (
        <div
          key={i}
          style={{
            ...styles.particle,
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

// Pre-computed particle data
const particleData = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 17 + 5) % 100}%`,
  top: `${(i * 23 + 10) % 100}%`,
  size: (i % 4) * 2 + 3,
  delay: `${(i * 0.7) % 6}s`,
  duration: `${8 + (i % 5) * 3}s`,
  opacity: 0.15 + (i % 3) * 0.1,
}));

/* ── Animated Rx Symbol ──────────────────────────────────────────── */
function RxLogo() {
  return (
    <motion.div
      style={styles.logoWrapper}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow behind logo */}
      <motion.div
        style={styles.logoGlow}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Main icon */}
      <div style={styles.logoIcon}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rx Symbol */}
          <path
            d="M8 8h6c4 0 7 2.5 7 6.5S18 21 14 21h-2l8 9"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Medical cross accent */}
          <path
            d="M26 8v8M22 12h8"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}

/* ── Main Login Page ─────────────────────────────────────────────── */
export default function LoginPage() {
  const [nama_pengguna, setNamaPengguna] = useState("");
  const [kata_laluan, setKataLaluan] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "username" | "password" | null
  >(null);
  const [mounted, setMounted] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama_pengguna || !kata_laluan) {
      toast.error("Sila isi semua medan yang diperlukan.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(nama_pengguna, kata_laluan);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Log masuk berjaya!");
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* Animated gradient background */}
      <div style={styles.bgGradient} />

      {/* Mesh overlay pattern */}
      <div style={styles.meshOverlay} />

      {/* Animated background orbs */}
      <BackgroundOrbs />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Grid pattern overlay */}
      <div style={styles.gridPattern} />

      {/* Main content */}
      <div style={styles.contentWrapper}>
        {/* Left branding area - desktop only */}
        <motion.div
          className="login-branding-section"
          style={styles.brandingSection}
          initial={{ opacity: 0, x: -60 }}
          animate={mounted ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div style={styles.brandingContent}>
            <div style={styles.brandingBadge}>v4.0</div>
            <h1 style={styles.brandingTitle}>
              Quick<span style={styles.brandingTitleAccent}>Rx</span>Record
            </h1>
            <p style={styles.brandingSubtitle}>
              Sistem Pengurusan Inventori & Pesakit
            </p>
            <div style={styles.brandingDivider} />
            <div style={styles.featureList}>
              {[
                "Pengurusan Stok",
                "Pembekalan Ubat",
                "Rekod Pesakit",
                "Laporan Analitikal",
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  style={styles.featureItem}
                  initial={{ opacity: 0, x: -20 }}
                  animate={mounted ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                >
                  <div style={styles.featureDot} />
                  <span style={styles.featureText}>{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Login card */}
        <motion.div
          style={styles.cardOuter}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Gradient border effect */}
          <div style={styles.cardBorderGradient} />

          {/* Card content */}
          <div style={styles.cardInner}>
            {/* Top accent bar */}
            <div style={styles.accentBar} />

            <div style={styles.cardContent}>
              {/* Mobile logo */}
              <div className="login-mobile-logo" style={styles.mobileLogoSection}>
                <RxLogo />
                <h2 style={styles.mobileTitle}>
                  Quick<span style={styles.brandingTitleAccent}>Rx</span>Record
                </h2>
                <p style={styles.mobileSubtitle}>
                  Sistem Pengurusan Inventori & Pesakit
                </p>
              </div>

              {/* Welcome text */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={styles.welcomeSection}
              >
                <h3 style={styles.welcomeTitle}>Selamat Datang</h3>
                <p style={styles.welcomeSubtitle}>
                  Masukkan nama pengguna dan kata laluan anda
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Username field */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  style={styles.fieldGroup}
                >
                  <Label
                    htmlFor="nama_pengguna"
                    style={styles.fieldLabel}
                  >
                    <User
                      size={14}
                      style={{
                        color:
                          focusedField === "username"
                            ? "#1877f2"
                            : "#9ca3af",
                        transition: "color 0.2s",
                      }}
                    />
                    Nama Pengguna
                  </Label>
                  <div style={styles.inputWrapper}>
                    <Input
                      id="nama_pengguna"
                      type="text"
                      value={nama_pengguna}
                      onChange={(e) => setNamaPengguna(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="username"
                      className={
                        focusedField === "username"
                          ? "ring-2 ring-primary/20 border-primary/50"
                          : ""
                      }
                      style={{
                        ...styles.input,
                        borderColor:
                          focusedField === "username"
                            ? "rgba(24, 119, 242, 0.5)"
                            : "#e5e7eb",
                        boxShadow:
                          focusedField === "username"
                            ? "0 0 0 3px rgba(24, 119, 242, 0.1), 0 2px 8px rgba(24, 119, 242, 0.08)"
                            : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                      placeholder="Masukkan nama pengguna"
                    />
                  </div>
                </motion.div>

                {/* Password field */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  style={styles.fieldGroup}
                >
                  <Label
                    htmlFor="kata_laluan"
                    style={styles.fieldLabel}
                  >
                    <Lock
                      size={14}
                      style={{
                        color:
                          focusedField === "password"
                            ? "#1877f2"
                            : "#9ca3af",
                        transition: "color 0.2s",
                      }}
                    />
                    Kata Laluan
                  </Label>
                  <div style={styles.inputWrapper}>
                    <Input
                      id="kata_laluan"
                      type={showPassword ? "text" : "password"}
                      value={kata_laluan}
                      onChange={(e) => setKataLaluan(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                      className={
                        focusedField === "password"
                          ? "ring-2 ring-primary/20 border-primary/50"
                          : ""
                      }
                      style={{
                        ...styles.input,
                        paddingRight: "48px",
                        borderColor:
                          focusedField === "password"
                            ? "rgba(24, 119, 242, 0.5)"
                            : "#e5e7eb",
                        boxShadow:
                          focusedField === "password"
                            ? "0 0 0 3px rgba(24, 119, 242, 0.1), 0 2px 8px rgba(24, 119, 242, 0.08)"
                            : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                      placeholder="Masukkan kata laluan"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff size={16} color="#9ca3af" />
                      ) : (
                        <Eye size={16} color="#9ca3af" />
                      )}
                    </button>
                  </div>
                </motion.div>

                {/* Submit button */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  style={{ marginTop: "28px" }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.submitButton,
                      opacity: loading ? 0.8 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform =
                          "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(24, 119, 242, 0.35), 0 4px 10px rgba(24, 119, 242, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 15px rgba(24, 119, 242, 0.25), 0 2px 6px rgba(24, 119, 242, 0.15)";
                    }}
                  >
                    {loading ? (
                      <span style={styles.buttonContent}>
                        <Loader2
                          size={18}
                          style={{
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>Log Masuk...</span>
                      </span>
                    ) : (
                      <span style={styles.buttonContent}>
                        <span>Log Masuk</span>
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </button>
                </motion.div>
              </form>

              {/* Forgot password */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={mounted ? { opacity: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.5 }}
                style={styles.forgotSection}
              >
                <Link href="/lupa-kata-laluan" style={styles.forgotLink}>
                  <Lock size={12} />
                  <span>Lupa kata laluan?</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        style={styles.footer}
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <p style={styles.footerText}>
          &copy; {new Date().getFullYear()} QuickRxRecord. Hak cipta
          terpelihara.
        </p>
      </motion.div>

      {/* Inline keyframes for compatibility */}
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
        @media (max-width: 768px) {
          .login-branding-section { display: none !important; }
          .login-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Style Objects (Chrome 109 compatible) ───────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  /* Page */
  pageWrapper: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflow: "hidden",
    background: "#0a0e27",
  },
  bgGradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, #0a0e27 0%, #1a1145 25%, #0d1b3e 50%, #0a1628 75%, #0a0e27 100%)",
    backgroundSize: "400% 400%",
    animation: "gradientShift 15s ease infinite",
  },
  meshOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 20% 50%, rgba(24, 119, 242, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
  },
  gridPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
  },

  /* Orbs */
  orbContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  orbPrimary: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(24, 119, 242, 0.2) 0%, rgba(24, 119, 242, 0.05) 50%, transparent 70%)",
    filter: "blur(60px)",
    top: "-10%",
    left: "-5%",
  },
  orbSecondary: {
    position: "absolute",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0.04) 50%, transparent 70%)",
    filter: "blur(60px)",
    top: "50%",
    right: "-10%",
  },
  orbAccent: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.03) 50%, transparent 70%)",
    filter: "blur(50px)",
    bottom: "-5%",
    left: "30%",
  },
  orbWarm: {
    position: "absolute",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 50%, transparent 70%)",
    filter: "blur(40px)",
    top: "20%",
    right: "20%",
  },

  /* Particles */
  particleContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.2)",
    animation: "floatParticle 8s ease-in-out infinite",
  },

  /* Content */
  contentWrapper: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: "960px",
    display: "flex",
    alignItems: "center",
    gap: "48px",
  },

  /* Branding (left side) */
  brandingSection: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandingContent: {
    maxWidth: "380px",
  },
  brandingBadge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: "20px",
    background: "rgba(24, 119, 242, 0.15)",
    border: "1px solid rgba(24, 119, 242, 0.25)",
    color: "#60a5fa",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    marginBottom: "20px",
  },
  brandingTitle: {
    fontSize: "42px",
    fontWeight: 800,
    color: "#ffffff",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    marginBottom: "12px",
  },
  brandingTitleAccent: {
    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  brandingSubtitle: {
    fontSize: "16px",
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 1.5,
    marginBottom: "24px",
  },
  brandingDivider: {
    width: "48px",
    height: "3px",
    borderRadius: "2px",
    background: "linear-gradient(90deg, #1877f2, #7c3aed)",
    marginBottom: "24px",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  featureDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1877f2, #60a5fa)",
    flexShrink: 0,
  },
  featureText: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: 500,
  },

  /* Card */
  cardOuter: {
    position: "relative",
    width: "100%",
    maxWidth: "440px",
    flexShrink: 0,
  },
  cardBorderGradient: {
    position: "absolute",
    inset: 0,
    borderRadius: "20px",
    padding: "1px",
    background:
      "linear-gradient(135deg, rgba(24, 119, 242, 0.4), rgba(124, 58, 237, 0.3), rgba(6, 182, 212, 0.2), rgba(24, 119, 242, 0.1))",
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as any,
    maskComposite: "exclude" as any,
    pointerEvents: "none" as const,
  },
  cardInner: {
    position: "relative",
    borderRadius: "20px",
    background:
      "rgba(255, 255, 255, 0.07)",
    WebkitBackdropFilter: "blur(24px)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    boxShadow:
      "0 25px 50px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  accentBar: {
    height: "3px",
    background:
      "linear-gradient(90deg, #1877f2, #7c3aed, #06b6d4, #1877f2)",
    backgroundSize: "200% 100%",
    animation: "gradientShift 4s ease infinite",
  },
  cardContent: {
    padding: "36px 32px 32px",
  },

  /* Mobile logo */
  mobileLogoSection: {
    textAlign: "center" as const,
    marginBottom: "28px",
    display: "none",
  },
  mobileTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.01em",
    marginBottom: "4px",
  },
  mobileSubtitle: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.45)",
  },

  /* Logo */
  logoWrapper: {
    position: "relative",
    width: "72px",
    height: "72px",
    margin: "0 auto 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    inset: "-12px",
    borderRadius: "20px",
    background:
      "radial-gradient(circle, rgba(24, 119, 242, 0.4) 0%, transparent 70%)",
    filter: "blur(16px)",
  },
  logoIcon: {
    position: "relative",
    width: "72px",
    height: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    boxShadow:
      "0 8px 24px rgba(24, 119, 242, 0.35), 0 4px 8px rgba(24, 119, 242, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  },

  /* Welcome */
  welcomeSection: {
    marginBottom: "28px",
  },
  welcomeTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "6px",
  },
  welcomeSubtitle: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.45)",
  },

  /* Fields */
  fieldGroup: {
    marginBottom: "20px",
  },
  fieldLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: "8px",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    height: "48px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1.5px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s ease",
    WebkitAppearance: "none" as any,
    boxSizing: "border-box" as const,
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "background 0.2s",
  },

  /* Submit */
  submitButton: {
    width: "100%",
    height: "50px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
    boxShadow:
      "0 4px 15px rgba(24, 119, 242, 0.25), 0 2px 6px rgba(24, 119, 242, 0.15)",
    letterSpacing: "0.02em",
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  /* Forgot */
  forgotSection: {
    marginTop: "24px",
    textAlign: "center" as const,
  },
  forgotLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.4)",
    textDecoration: "none",
    transition: "color 0.2s",
  },

  /* Footer */
  footer: {
    position: "relative",
    zIndex: 10,
    marginTop: "32px",
  },
  footerText: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.25)",
    textAlign: "center" as const,
  },
};
