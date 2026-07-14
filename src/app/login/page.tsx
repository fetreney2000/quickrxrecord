"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Activity } from "lucide-react";

export default function LoginPage() {
  const [nama_pengguna, setNamaPengguna] = useState("");
  const [kata_laluan, setKataLaluan] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0a1e] via-[#1a1030] to-[#0f0a1e] p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#ec4899]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#06b6d4]/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative border-[#2d1b4e] bg-[#1a1030]/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] shadow-lg shadow-[#7c3aed]/30">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">
            QuickRxRecord
          </CardTitle>
          <CardDescription className="text-[#9888b0] mt-1 text-sm">
            Sistem Pengurusan Inventori & Pesakit v4.0
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nama_pengguna" className="text-sm font-medium text-[#e8e0f0]">
                Nama Pengguna
              </Label>
              <Input
                id="nama_pengguna"
                type="text"
                placeholder="Masukkan nama pengguna"
                value={nama_pengguna}
                onChange={(e) => setNamaPengguna(e.target.value)}
                autoComplete="username"
                className="h-11 bg-[#0f0a1e]/60 border-[#2d1b4e] text-[#e8e0f0] placeholder:text-[#9888b0]/50 focus:border-[#7c3aed] focus:ring-[#7c3aed]/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kata_laluan" className="text-sm font-medium text-[#e8e0f0]">
                Kata Laluan
              </Label>
              <Input
                id="kata_laluan"
                type="password"
                placeholder="Masukkan kata laluan"
                value={kata_laluan}
                onChange={(e) => setKataLaluan(e.target.value)}
                autoComplete="current-password"
                className="h-11 bg-[#0f0a1e]/60 border-[#2d1b4e] text-[#e8e0f0] placeholder:text-[#9888b0]/50 focus:border-[#7c3aed] focus:ring-[#7c3aed]/30"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#db2777] text-white font-semibold shadow-lg shadow-[#7c3aed]/25 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Log Masuk...
                </>
              ) : (
                "Log Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}