"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import {
  Activity,
  LogOut,
  Stethoscope,
  LayoutDashboard,
  Pill,
  FileText,
  UserCog,
  Shield,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Papan Pemuka", icon: LayoutDashboard, color: "#3b82f6", permission: null },
  { href: "/pantas", label: "Dispen Pantas", icon: Zap, color: "#f0932b", permission: "manage_supply" },
  { href: "/pesakit", label: "Pesakit", icon: Stethoscope, color: "#10b981", permission: "view_patients" },
  { href: "/stok", label: "Inventori", icon: Pill, color: "#8b5cf6", permission: "view_items" },
  { href: "/laporan", label: "Laporan", icon: FileText, color: "#f43f5e", permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan", icon: UserCog, color: "#06b6d4", permission: "manage_users" },
  { href: "/hakcipta", label: "Hak Cipta", icon: Shield, color: "#f59e0b", permission: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <>
      <style>{`
        @-webkit-keyframes sidebarOrbFloat1 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(20px, -15px); transform: translate(20px, -15px); } }
        @keyframes sidebarOrbFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -15px); } }
        @-webkit-keyframes sidebarOrbFloat2 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(-15px, 20px); transform: translate(-15px, 20px); } }
        @keyframes sidebarOrbFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-15px, 20px); } }
        @-webkit-keyframes sidebarOrbFloat3 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(10px, -10px); transform: translate(10px, -10px); } }
        @keyframes sidebarOrbFloat3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(10px, -10px); } }
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
        }
      `}</style>
      <aside className="app-sidebar" style={styles.sidebar}>
        {/* Animated sidebar orbs */}
        <div style={styles.orbContainer}>
          <div style={{ ...styles.sidebarOrb, width: "300px", height: "300px", top: "10%", left: "-30%", background: "radial-gradient(circle, rgba(24,119,242,0.08) 0%, transparent 70%)", animation: "sidebarOrbFloat1 20s ease-in-out infinite" }} />
          <div style={{ ...styles.sidebarOrb, width: "250px", height: "250px", top: "60%", right: "-20%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", animation: "sidebarOrbFloat2 25s ease-in-out infinite" }} />
          <div style={{ ...styles.sidebarOrb, width: "200px", height: "200px", bottom: "5%", left: "10%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", animation: "sidebarOrbFloat3 18s ease-in-out infinite" }} />
        </div>
        <div style={styles.sidebarInner}>
          {/* Logo */}
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>
              <Activity size={22} color="white" />
            </div>
            <div>
              <div style={styles.logoTitle}>QuickRxRecord <span style={{ fontSize: "10px", fontWeight: 700, color: "#60a5fa", background: "rgba(24,119,242,0.15)", padding: "1px 6px", borderRadius: "6px", marginLeft: "4px", verticalAlign: "middle" }}>v4</span></div>
              <div style={styles.logoSubtitle}>Jabatan Farmasi Hospital Keningau</div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={styles.nav}>
            {navItems.map((item) => {
              if (item.permission && !hasPermission(profile?.peranan, item.permission)) {
                return null;
              }
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
                    }
                  }}
                >
                  <div style={{
                    ...styles.navIcon,
                    ...(isActive ? { background: item.color, boxShadow: "0 4px 12px " + item.color + "40" } : {}),
                  }}>
                    <item.icon size={16} color="white" />
                  </div>
                  <span>{item.label}</span>
                  {isActive && <div style={styles.activeDot} />}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div style={styles.userSection}>
            <div style={styles.userCard}>
              <Link href="/profil" style={styles.userAvatar}>
                {profile?.nama?.charAt(0)?.toUpperCase() || "?"}
              </Link>
              <Link href="/profil" style={styles.userInfo}>
                <div style={styles.userName}>{profile?.nama}</div>
                <div style={styles.userRole}>{profile?.peranan}</div>
              </Link>
              <button
                onClick={() => signOut()}
                title="Log Keluar"
                style={styles.logoutButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(228, 30, 63, 0.15)";
                  e.currentTarget.style.color = "#e41e3f";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)";
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Styles (Chrome 109 compatible) ──────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "256px",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #0c1329 0%, #0a0e27 50%, #0d1117 100%)",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
  },
  sidebarInner: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    height: "64px",
    flexShrink: 0,
    padding: "0 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    background: "linear-gradient(90deg, rgba(24, 119, 242, 0.06) 0%, transparent 100%)",
  },
  logoIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(24, 119, 242, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#ffffff",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
  },
  logoSubtitle: {
    fontSize: "10px",
    color: "rgba(255, 255, 255, 0.45)",
    fontWeight: 500,
    lineHeight: 1.3,
    marginTop: "2px",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "24px 12px 16px",
    overflowY: "auto" as const,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.55)",
    textDecoration: "none",
    transition: "all 0.2s ease",
    position: "relative" as const,
  },
  navItemActive: {
    background: "rgba(24, 119, 242, 0.1)",
    color: "#60a5fa",
    border: "1px solid rgba(24, 119, 242, 0.15)",
    boxShadow: "0 2px 8px rgba(24, 119, 242, 0.08)",
  },
  navIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "rgba(255, 255, 255, 0.06)",
    transition: "all 0.2s ease",
  },
  activeDot: {
    marginLeft: "auto",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#1877f2",
    boxShadow: "0 0 8px rgba(24, 119, 242, 0.5)",
  },
  userSection: {
    flexShrink: 0,
    padding: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    background: "linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.02))",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #1877f2, #0d5bd4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(24, 119, 242, 0.3)",
    transition: "box-shadow 0.2s ease",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    textDecoration: "none",
  },
  userName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  userRole: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.4)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  orbContainer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  sidebarOrb: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(40px)",
  },
  logoutButton: {
    background: "transparent",
    border: "none",
    padding: "8px",
    borderRadius: "8px",
    color: "rgba(255, 255, 255, 0.4)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },
};