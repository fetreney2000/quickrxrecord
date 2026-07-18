"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { LayoutDashboard, Stethoscope, Pill, FileText, UserCog } from "lucide-react";

const navItems = [
  { href: "/", label: "Utama", icon: LayoutDashboard, color: "#3b82f6", permission: null },
  { href: "/pesakit", label: "Pesakit", icon: Stethoscope, color: "#10b981", permission: "view_patients" },
  { href: "/stok", label: "Stok", icon: Pill, color: "#8b5cf6", permission: "view_items" },
  { href: "/laporan", label: "Laporan", icon: FileText, color: "#f43f5e", permission: "view_reports" },
  { href: "/pengurusan", label: "Admin", icon: UserCog, color: "#06b6d4", permission: "manage_users" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .mobile-nav-root { display: none !important; }
        }
        @media (max-width: 768px) {
          .mobile-nav-root { display: flex !important; }
        }
      `}</style>
      <nav className="mobile-nav-root" style={styles.mobileNav}>
        <div style={styles.navBg} />
        <div style={styles.navInner}>
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
                  color: isActive ? item.color : "rgba(255, 255, 255, 0.45)",
                }}
              >
                <div style={{
                  ...styles.iconWrap,
                  ...(isActive ? { background: item.color + "18", boxShadow: "0 2px 8px " + item.color + "25" } : {}),
                }}>
                  <item.icon size={20} color={isActive ? item.color : "rgba(255, 255, 255, 0.45)"} />
                </div>
                <span style={{
                  ...styles.label,
                  color: isActive ? item.color : "rgba(255, 255, 255, 0.4)",
                  fontWeight: isActive ? 600 : 500,
                }}>
                  {item.label}
                </span>
                {isActive && <div style={{ ...styles.activeIndicator, background: item.color }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mobileNav: {
    display: "none",
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: "64px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  navBg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(10, 14, 39, 0.97), rgba(8, 12, 30, 0.99))",
    WebkitBackdropFilter: "blur(24px)",
    backdropFilter: "blur(24px)",
  },
  navInner: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "64px",
    padding: "0 2px",
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    padding: "6px 2px",
    borderRadius: "10px",
    textDecoration: "none",
    transition: "all 0.2s ease",
    position: "relative" as const,
    flex: 1,
    minWidth: 0,
    maxWidth: "72px",
  },
  iconWrap: {
    width: "32px",
    height: "26px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  label: {
    fontSize: "10px",
    lineHeight: 1,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    textAlign: "center" as const,
  },
  activeIndicator: {
    position: "absolute",
    top: "0px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "24px",
    height: "2px",
    borderRadius: "1px",
  },
};