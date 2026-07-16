"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Activity,
  LogOut,
  Stethoscope,
  LayoutDashboard,
  Pill,
  Truck,
  FileText,
  UserCog,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Papan Pemuka", icon: LayoutDashboard, gradient: "from-blue-500 to-blue-600", bgGradient: "from-blue-50 to-blue-100/50", permission: null },
  { href: "/pesakit", label: "Pesakit", icon: Stethoscope, gradient: "from-emerald-500 to-emerald-600", bgGradient: "from-emerald-50 to-emerald-100/50", permission: "view_patients" },
  { href: "/stok", label: "Stok & Item", icon: Pill, gradient: "from-violet-500 to-violet-600", bgGradient: "from-violet-50 to-violet-100/50", permission: "view_items" },
  { href: "/bekalan", label: "Bekalan Ubat", icon: Truck, gradient: "from-amber-500 to-amber-600", bgGradient: "from-amber-50 to-amber-100/50", permission: "manage_supply" },
  { href: "/laporan", label: "Laporan", icon: FileText, gradient: "from-rose-500 to-rose-600", bgGradient: "from-rose-50 to-rose-100/50", permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan", icon: UserCog, gradient: "from-cyan-500 to-cyan-600", bgGradient: "from-cyan-50 to-cyan-100/50", permission: "manage_users" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border z-30 shadow-sm">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 flex-shrink-0 px-5 border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground leading-tight">QuickRxRecord</span>
            <span className="text-[10px] text-primary font-medium tracking-wider uppercase">v4.0</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto pt-6 pb-4 px-3">
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
                    "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? `bg-gradient-to-r ${item.bgGradient} text-sidebar-primary shadow-sm border border-sidebar-primary/15`
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    isActive 
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-sm` 
                      : "bg-sidebar-accent/50 text-sidebar-foreground/50 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-4 bg-gradient-to-b from-transparent to-sidebar-accent/30">
          <div className="flex items-center gap-3">
            <Link href="/profil" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-bold flex-shrink-0 hover:shadow-lg hover:shadow-primary/20 transition-all shadow-sm">
              {profile?.nama?.charAt(0)?.toUpperCase() || "?"}
            </Link>
            <Link href="/profil" className="flex-1 min-w-0 group">
              <p className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
                {profile?.nama}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate group-hover:text-primary/70 transition-colors cursor-pointer">
                {profile?.peranan}
              </p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Log Keluar"
              className="text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-9 w-9 rounded-lg transition-all"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}