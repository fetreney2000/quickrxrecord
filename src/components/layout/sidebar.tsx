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
  Pill,
  Home,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Papan Pemuka", icon: Home, permission: null },
  { href: "/pesakit", label: "Pesakit", icon: Users, permission: "view_patients" },
  { href: "/stok", label: "Stok & Item", icon: Package, permission: "view_items" },
  { href: "/bekalan", label: "Bekalan Ubat", icon: ClipboardList, permission: "manage_supply" },
  { href: "/laporan", label: "Laporan", icon: BarChart3, permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan Pengguna", icon: Settings, permission: "manage_users" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b">
          <Pill className="h-6 w-6 text-sidebar-primary" />
          <span className="ml-2 text-lg font-semibold text-sidebar-foreground">QuickRx</span>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-2 space-y-1">
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
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t p-4">
          <div className="flex items-center w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.nama}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.peranan}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Log Keluar"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}