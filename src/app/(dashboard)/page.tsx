"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Users, Package, ClipboardList, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [patients, items, supplyToday, expiringBatches] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("aktif", true).is("merged_into", null),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("aktif", true),
        supabase.from("supply_records").select("id", { count: "exact", head: true })
          .gte("tarikh_dibekal", new Date().toISOString().split("T")[0]),
        supabase.from("item_batches").select("id", { count: "exact", head: true })
          .lt("tarikh_luput", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .gt("kuantiti", 0),
      ]);

      return {
        totalPatients: patients.count || 0,
        totalItems: items.count || 0,
        supplyToday: supplyToday.count || 0,
        expiringSoon: expiringBatches.count || 0,
      };
    },
  });

  const statCards = [
    { 
      title: "Pesakit Aktif", value: stats?.totalPatients ?? "-", icon: Users, 
      gradient: "gradient-card-blue", glow: "glow-blue", 
      subtitle: "Jumlah pesakit dalam sistem",
      delay: 0,
    },
    { 
      title: "Item Ubatan", value: stats?.totalItems ?? "-", icon: Package, 
      gradient: "gradient-card-green", glow: "glow-green", 
      subtitle: "Item ubat didaftarkan",
      delay: 0.1,
    },
    { 
      title: "Bekalan Hari Ini", value: stats?.supplyToday ?? "-", icon: TrendingUp, 
      gradient: "gradient-card-purple", glow: "glow-blue", 
      subtitle: "Rekod bekalan hari ini",
      delay: 0.2,
    },
    { 
      title: "Akan Luput (30 Hari)", value: stats?.expiringSoon ?? "-", icon: AlertTriangle, 
      gradient: "gradient-card-orange", glow: "glow-green", 
      subtitle: "Kelompok akan tamat tempoh",
      delay: 0.3,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="icon-circle gradient-card-blue">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Selamat Datang, {profile?.nama}</h1>
              <p className="text-muted-foreground text-sm">Papan Pemuka Sistem Pengurusan Inventori & Pesakit</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Sistem Beroperasi</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: card.delay, duration: 0.5, ease: "easeOut" }}
            className="premium-card hover-lift"
          >
            <div className={`${card.gradient} rounded-xl p-5 ${card.glow} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{card.title}</p>
                  <p className="text-3xl font-extrabold text-white stat-number">{card.value}</p>
                  <p className="text-white/60 text-[10px] mt-1">{card.subtitle}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 premium-card">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pautan Pantas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Cari Pesakit", href: "/pesakit", icon: Users, color: "gradient-card-blue" },
            { label: "Urus Stok", href: "/stok", icon: Package, color: "gradient-card-green" },
            { label: "Bekalan Ubat", href: "/bekalan", icon: ClipboardList, color: "gradient-card-purple" },
            { label: "Laporan", href: "/laporan", icon: TrendingUp, color: "gradient-card-orange" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="block group">
              <div className={`${link.color} rounded-xl p-4 text-white hover-lift transition-all duration-300`}>
                <link.icon className="h-5 w-5 mb-2 opacity-90" />
                <p className="text-sm font-semibold">{link.label}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}