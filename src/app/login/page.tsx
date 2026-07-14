"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pill } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">QuickRx</CardTitle>
          <CardDescription>Sistem Pengurusan Inventori & Pesakit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_pengguna">Nama Pengguna</Label>
              <Input
                id="nama_pengguna"
                type="text"
                placeholder="Masukkan nama pengguna"
                value={nama_pengguna}
                onChange={(e) => setNamaPengguna(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kata_laluan">Kata Laluan</Label>
              <Input
                id="kata_laluan"
                type="password"
                placeholder="Masukkan kata laluan"
                value={kata_laluan}
                onChange={(e) => setKataLaluan(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
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