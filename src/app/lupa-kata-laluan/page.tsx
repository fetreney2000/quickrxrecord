"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, HelpCircle } from "lucide-react";

export default function LupaKataLaluanPage() {
  const [nama_pengguna, setNamaPengguna] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama_pengguna) {
      toast.error("Sila masukkan nama pengguna anda.");
      return;
    }
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nama_pengguna")
        .eq("nama_pengguna", nama_pengguna)
        .single();

      if (error || !profiles) {
        toast.error("Nama pengguna tidak dijumpai.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profiles.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setSent(true);
          setLoading(false);
          return;
        }
        toast.error(data.error || "Gagal menghantar permintaan.");
      } else {
        setSent(true);
      }
    } catch {
      toast.error("Ralat semasa memproses permintaan.");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-2xl">
          <CardContent className="pt-8 pb-6 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <HelpCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl mb-2">Permintaan Dihantar</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Permintaan reset kata laluan anda telah dihantar kepada pentadbir. Anda akan dimaklumkan apabila kata laluan anda telah ditetapkan semula.
              </CardDescription>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Log Masuk
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-lg shadow-black/20">
            <HelpCircle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Lupa Kata Laluan?</CardTitle>
          <CardDescription className="text-muted-foreground mt-1 text-sm">
            Masukkan nama pengguna anda. Permintaan akan dihantar kepada pentadbir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Nama Pengguna</Label>
              <Input
                value={nama_pengguna}
                onChange={(e) => setNamaPengguna(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghantar...</>
              ) : (
                "Hantar Permintaan"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="inline h-3 w-3 mr-1" /> Kembali ke Log Masuk
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}