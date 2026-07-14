"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ClipboardList, AlertTriangle } from "lucide-react";
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
    { title: "Jumlah Pesakit Aktif", value: stats?.totalPatients ?? "-", icon: Users, color: "text-blue-600" },
    { title: "Jumlah Item", value: stats?.totalItems ?? "-", icon: Package, color: "text-green-600" },
    { title: "Bekalan Hari Ini", value: stats?.supplyToday ?? "-", icon: ClipboardList, color: "text-purple-600" },
    { title: "Akan Luput (30 Hari)", value: stats?.expiringSoon ?? "-", icon: AlertTriangle, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat Datang, {profile?.nama}</h1>
        <p className="text-muted-foreground">Papan Pemuka Sistem Pengurusan Inventori & Pesakit</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}