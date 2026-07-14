"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Papan Pemuka", icon: LayoutDashboard, permission: null },
  { href: "/pesakit", label: "Pesakit", icon: Users, permission: "view_patients" },
  { href: "/stok", label: "Stok & Item", icon: Package, permission: "view_items" },
  { href: "/bekalan", label: "Bekalan Ubat", icon: ClipboardList, permission: "manage_supply" },
  { href: "/laporan", label: "Laporan", icon: BarChart3, permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan", icon: Settings, permission: "manage_users" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border z-30">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 flex-shrink-0 px-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ec4899] shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground leading-tight">QuickRxRecord</span>
            <span className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">v4.0</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4 px-3">
          <nav className="flex-1 space-y-1">
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
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm border border-sidebar-primary/20"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                  )} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary text-sm font-bold flex-shrink-0">
              {profile?.nama?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {profile?.nama}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {profile?.peranan}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Log Keluar"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}