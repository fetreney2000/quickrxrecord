"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { LayoutDashboard, Stethoscope, Pill, FileText, UserCog, User, Shield, Zap } from "lucide-react";

const navItems = [
  { href: "/", label: "Utama", icon: LayoutDashboard, color: "#3b82f6", permission: null },
  { href: "/pantas", label: "Pantas", icon: Zap, color: "#f0932b", permission: "manage_supply" },
  { href: "/pesakit", label: "Pesakit", icon: Stethoscope, color: "#10b981", permission: "view_patients" },
  { href: "/stok", label: "Inventori", icon: Pill, color: "#8b5cf6", permission: "view_items" },
  { href: "/laporan", label: "Laporan", icon: FileText, color: "#f43f5e", permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan", icon: UserCog, color: "#06b6d4", permission: "manage_users" },
  { href: "/profil", label: "Profil", icon: User, color: "#22c55e", permission: null },
  { href: "/hakcipta", label: "Hak Cipta", icon: Shield, color: "#f59e0b", permission: null },
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
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 0;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .mobile-nav-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
      `}</style>
      <nav className="mobile-nav-root" style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "60px",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
      }}>
        {/* Background */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(12, 16, 42, 0.98), rgba(10, 14, 35, 1))",
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.3)",
        }} />
        {/* Nav items */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "60px",
          padding: "0 4px",
        }}>
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
                className="mobile-nav-item"
                style={{
                  color: isActive ? item.color : "rgba(255, 255, 255, 0.5)",
                }}
              >
                {isActive && <div style={{
                  position: "absolute",
                  top: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "20px",
                  height: "2px",
                  borderRadius: "1px",
                  background: item.color,
                }} />}
                <div
                  className="mobile-nav-icon"
                  style={isActive ? {
                    background: item.color + "20",
                    boxShadow: "0 2px 10px " + item.color + "30",
                  } : {}}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? item.color : "rgba(255, 255, 255, 0.5)"} />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}