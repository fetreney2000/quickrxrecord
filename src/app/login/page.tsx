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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-black/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative border-border bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-lg shadow-black/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            QuickRxRecord
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1 text-sm">
            Sistem Pengurusan Inventori & Pesakit v4.0
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nama_pengguna" className="text-sm font-medium text-foreground">
                Nama Pengguna
              </Label>
              <Input
                id="nama_pengguna"
                type="text"
                value={nama_pengguna}
                onChange={(e) => setNamaPengguna(e.target.value)}
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kata_laluan" className="text-sm font-medium text-foreground">
                Kata Laluan
              </Label>
              <Input
                id="kata_laluan"
                type="password"
                value={kata_laluan}
                onChange={(e) => setKataLaluan(e.target.value)}
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
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