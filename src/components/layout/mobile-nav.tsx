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
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 0;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .mobile-nav-icon {
          width: 32px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .mobile-nav-label {
          font-size: 10px;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          text-align: center;
        }
      `}</style>
      <nav className="mobile-nav-root" style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "64px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}>
        {/* Background */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10, 14, 39, 0.97), rgba(8, 12, 30, 0.99))",
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
        }} />
        {/* Nav items */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "64px",
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
                  color: isActive ? item.color : "rgba(255, 255, 255, 0.45)",
                }}
              >
                {isActive && <div style={{
                  position: "absolute",
                  top: "0px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "24px",
                  height: "2px",
                  borderRadius: "1px",
                  background: item.color,
                }} />}
                <div
                  className="mobile-nav-icon"
                  style={isActive ? {
                    background: item.color + "18",
                    boxShadow: "0 2px 8px " + item.color + "25",
                  } : {}}
                >
                  <item.icon size={20} color={isActive ? item.color : "rgba(255, 255, 255, 0.45)"} />
                </div>
                <span
                  className="mobile-nav-label"
                  style={{
                    color: isActive ? item.color : "rgba(255, 255, 255, 0.4)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}