"use client";

import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users, Package, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { motion, useInView } from "framer-motion";

// Animated counter component
function AnimatedNumber({ value, duration = 2 }: { value: number | string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const num = typeof value === "number" ? value : parseInt(value) || 0;

  return (
    <motion.span
      ref={ref}
      className="stat-number"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <CountingNumber to={num} duration={duration} />
        </motion.span>
      ) : "0"}
    </motion.span>
  );
}

function CountingNumber({ to, duration }: { to: number; duration: number }) {
  const [count, setCount] = React.useState(0);
  const ref = useRef<number>(0);
  const startTime = useRef<number>(0);

  React.useEffect(() => {
    if (to === 0) {
      setCount(0);
      return;
    }
    startTime.current = performance.now();
    ref.current = requestAnimationFrame(function animate(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * to));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    });
    return () => cancelAnimationFrame(ref.current);
  }, [to, duration]);

  return <>{count.toLocaleString()}</>;
}

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
      title: "Pesakit Aktif", value: stats?.totalPatients ?? 0, icon: Users, 
      gradient: "from-blue-600 to-blue-500", bgGlow: "bg-blue-500/10",
      subtitle: "Jumlah pesakit dalam sistem",
      delay: 0,
    },
    { 
      title: "Item Ubatan", value: stats?.totalItems ?? 0, icon: Package, 
      gradient: "from-emerald-600 to-emerald-500", bgGlow: "bg-emerald-500/10",
      subtitle: "Item ubat didaftarkan",
      delay: 0.15,
    },
    { 
      title: "Bekalan Hari Ini", value: stats?.supplyToday ?? 0, icon: TrendingUp, 
      gradient: "from-violet-600 to-violet-500", bgGlow: "bg-violet-500/10",
      subtitle: "Rekod bekalan hari ini",
      delay: 0.3,
    },
    { 
      title: "Akan Luput (30 Hari)", value: stats?.expiringSoon ?? 0, icon: AlertTriangle, 
      gradient: "from-orange-600 to-orange-500", bgGlow: "bg-orange-500/10",
      subtitle: "Kelompok akan tamat tempoh",
      delay: 0.45,
    },
  ];

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 60,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 100,
        duration: 0.6,
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring" as const,
        damping: 15,
        stiffness: 200,
        delay: 0.3,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <motion.div 
              className="icon-circle gradient-card-blue"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
            >
              <Activity className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <motion.h1 
                className="text-2xl font-bold"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                Selamat Datang, {profile?.nama}
              </motion.h1>
              <motion.p 
                className="text-muted-foreground text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                Papan Pemuka Sistem Pengurusan Inventori & Pesakit
              </motion.p>
            </div>
          </div>
        </div>
        <motion.div 
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-lg"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <motion.div 
            className="w-2 h-2 rounded-full bg-success"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-xs font-medium text-muted-foreground">Sistem Beroperasi</span>
        </motion.div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div 
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.title}
            variants={cardVariants}
            whileHover={{ 
              y: -8, 
              scale: 1.02,
              transition: { type: "spring", stiffness: 300, damping: 15 }
            }}
            whileTap={{ scale: 0.98 }}
            className="relative"
          >
            <motion.div 
              className={`rounded-xl p-5 relative overflow-hidden`}
              style={{
                background: `linear-gradient(135deg, ${card.gradient.split(" ")[0].split("-")[0] === "from" ? "" : ""}, transparent)`,
              }}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              
              {/* Decorative circles */}
              <motion.div 
                className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
              
              {/* Content */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1.5">
                  <motion.p 
                    className="text-white/70 text-xs font-medium uppercase tracking-wider"
                    whileHover={{ letterSpacing: "0.1em" }}
                    transition={{ duration: 0.3 }}
                  >
                    {card.title}
                  </motion.p>
                  <div className="text-3xl font-extrabold text-white">
                    <AnimatedNumber value={card.value} duration={1.5} />
                  </div>
                  <p className="text-white/60 text-[10px] mt-1">{card.subtitle}</p>
                </div>
                <motion.div 
                  className="p-3 rounded-xl bg-white/15 backdrop-blur-sm"
                  variants={iconVariants}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </motion.div>
              </div>

              {/* Shimmer overlay on hover */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}