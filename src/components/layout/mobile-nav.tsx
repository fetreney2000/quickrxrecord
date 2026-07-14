"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Stethoscope, Pill, Truck, FileText, UserCog } from "lucide-react";

const navItems = [
  { href: "/", label: "Utama", icon: LayoutDashboard, color: "text-blue-500", permission: null },
  { href: "/pesakit", label: "Pesakit", icon: Stethoscope, color: "text-emerald-500", permission: "view_patients" },
  { href: "/stok", label: "Stok", icon: Pill, color: "text-violet-500", permission: "view_items" },
  { href: "/bekalan", label: "Bekalan", icon: Truck, color: "text-amber-500", permission: "manage_supply" },
  { href: "/laporan", label: "Laporan", icon: FileText, color: "text-rose-500", permission: "view_reports" },
  { href: "/pengurusan", label: "Pengurusan", icon: UserCog, color: "text-cyan-500", permission: "manage_users" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
      <div className="flex items-center justify-around h-16 px-1">
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
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md transition-colors min-w-0 flex-1",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", item.color || "")} />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}