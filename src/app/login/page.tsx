"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Activity, Eye, EyeOff, Lock, User } from "lucide-react";

// Floating particles decoration
function FloatingParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3,
    delay: Math.random() * 5,
    duration: Math.random() * 8 + 6,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/15 backdrop-blur-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 10, 0],
            opacity: [0.3, 0.7, 0.4, 0.8, 0.3],
            scale: [1, 1.3, 0.8, 1.1, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [nama_pengguna, setNamaPengguna] = useState("");
  const [kata_laluan, setKataLaluan] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama_pengguna || !kata_laluan) {
      toast.error("Sila isi semua medan yang diperlukan.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(nama_pengguna, kata_laluan);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Log masuk berjaya!");
      router.push("/");
      router.refresh();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 120,
      },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        damping: 18,
        stiffness: 100,
      },
    },
  };

  const floatingShapes = [
    { color: "from-primary/20 to-primary/5", size: "w-72 h-72", x: "-10%", y: "-15%", delay: 0 },
    { color: "from-violet-500/15 to-violet-500/5", size: "w-96 h-96", x: "70%", y: "60%", delay: 1 },
    { color: "from-emerald-500/10 to-emerald-500/5", size: "w-48 h-48", x: "80%", y: "-5%", delay: 2 },
    { color: "from-amber-500/10 to-amber-500/5", size: "w-56 h-56", x: "-5%", y: "70%", delay: 0.5 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Animated background shapes */}
      {floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br ${shape.color} ${shape.size} blur-3xl`}
          style={{ left: shape.x, top: shape.y }}
          animate={{
            scale: [1, 1.15, 1, 1.1, 1],
            rotate: [0, 5, -3, 7, 0],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            delay: shape.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating particles */}
      <FloatingParticles />

      {/* Main card */}
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Glass card */}
        <div className="relative backdrop-blur-xl bg-white/80 rounded-2xl shadow-2xl shadow-primary/10 border border-white/50 overflow-hidden">
          {/* Top gradient accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-violet-500 to-emerald-500" />

          <motion.div 
            className="p-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo section */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <motion.div 
                className="mx-auto mb-4 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative">
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-2xl blur-xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                </div>
              </motion.div>
              
              <motion.h1 
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent"
                variants={itemVariants}
              >
                QuickRxRecord
              </motion.h1>
              <motion.p 
                className="text-muted-foreground text-sm mt-1"
                variants={itemVariants}
              >
                Sistem Pengurusan Inventori & Pesakit
              </motion.p>
              <motion.div 
                className="mt-2 inline-block px-3 py-0.5 bg-primary/5 border border-primary/10 rounded-full"
                variants={itemVariants}
              >
                <span className="text-[10px] font-semibold text-primary tracking-wider">v4.0</span>
              </motion.div>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div className="space-y-2" variants={inputVariants}>
                <Label htmlFor="nama_pengguna" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary/60" />
                  Nama Pengguna
                </Label>
                <div className="relative">
                  <Input
                    id="nama_pengguna"
                    type="text"
                    value={nama_pengguna}
                    onChange={(e) => setNamaPengguna(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="username"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      focusedField === "username" 
                        ? "border-primary/40 shadow-sm shadow-primary/10 ring-2 ring-primary/10" 
                        : "border-input hover:border-primary/30"
                    }`}
                    placeholder="Masukkan nama pengguna"
                  />
                </div>
              </motion.div>

              <motion.div className="space-y-2" variants={inputVariants}>
                <Label htmlFor="kata_laluan" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary/60" />
                  Kata Laluan
                </Label>
                <div className="relative">
                  <Input
                    id="kata_laluan"
                    type={showPassword ? "text" : "password"}
                    value={kata_laluan}
                    onChange={(e) => setKataLaluan(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="current-password"
                    className={`h-12 pl-4 pr-12 rounded-xl border-2 transition-all duration-200 ${
                      focusedField === "password" 
                        ? "border-primary/40 shadow-sm shadow-primary/10 ring-2 ring-primary/10" 
                        : "border-input hover:border-primary/30"
                    }`}
                    placeholder="Masukkan kata laluan"
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </motion.button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 font-semibold text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <motion.span 
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Log Masuk...
                      </motion.span>
                    ) : (
                      <motion.span 
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        Log Masuk
                      </motion.span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </form>

            <motion.div 
              className="mt-6 text-center"
              variants={itemVariants}
            >
              <Link 
                href="/lupa-kata-laluan" 
                className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-all duration-200"
              >
                <span className="group-hover:underline">Lupa kata laluan?</span>
                <motion.span
                  className="inline-block"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom decorative text */}
        <motion.p 
          className="text-center text-xs text-muted-foreground/50 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          &copy; {new Date().getFullYear()} QuickRxRecord. Hak cipta terpelihara.
        </motion.p>
      </motion.div>
    </div>
  );
}