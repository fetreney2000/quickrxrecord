"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, User, Lock, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(profile ? { nama: profile.nama, jawatan: profile.jawatan || "", nama_pengguna: profile.nama_pengguna } : { nama: "", jawatan: "", nama_pengguna: "" });

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase.from("profiles").update({ nama: data.nama, jawatan: data.jawatan || null, nama_pengguna: data.nama_pengguna }).eq("id", profile?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil dikemaskini.");
      setEditing(false);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Gagal mengemaskini profil."),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile?.id, currentPassword: pwd.current, newPassword: pwd.newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Kata laluan berjaya ditukar.");
      setChangingPassword(false);
      setPwd({ current: "", newPwd: "", confirm: "" });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menukar kata laluan."),
  });

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Profil" }]} />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Profil Pengguna</h1>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Maklumat Peribadi
            </CardTitle>
            <CardDescription>Kemaskini maklumat profil anda.</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => { setEditing(true); setEditData({ nama: profile.nama, jawatan: profile.jawatan || "", nama_pengguna: profile.nama_pengguna }); }}>
              Edit Profil
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama</Label><Input value={editData.nama} onChange={e => setEditData({ ...editData, nama: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nama Pengguna</Label><Input value={editData.nama_pengguna} onChange={e => setEditData({ ...editData, nama_pengguna: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Jawatan</Label><Input value={editData.jawatan} onChange={e => setEditData({ ...editData, jawatan: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button onClick={() => updateProfileMutation.mutate(editData)} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nama:</span>
                <p className="font-medium mt-0.5">{profile.nama}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nama Pengguna:</span>
                <p className="font-mono font-medium mt-0.5">{profile.nama_pengguna}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Jawatan:</span>
                <p className="font-medium mt-0.5">{profile.jawatan || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Peranan:</span>
                <Badge variant="outline" className="mt-0.5">{profile.peranan}</Badge>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">ID Pengguna:</span>
                <p className="font-mono text-xs mt-0.5 break-all text-muted-foreground">{profile.id}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Tukar Kata Laluan
          </CardTitle>
          <CardDescription>Tukar kata laluan anda sendiri.</CardDescription>
        </CardHeader>
        <CardContent>
          {changingPassword ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Kata Laluan Semasa</Label><Input type="password" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kata Laluan Baharu</Label><Input type="password" value={pwd.newPwd} onChange={e => setPwd({ ...pwd, newPwd: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sahkan Kata Laluan Baharu</Label><Input type="password" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (pwd.newPwd !== pwd.confirm) { toast.error("Kata laluan baharu tidak sepadan."); return; }
                    if (pwd.newPwd.length < 6) { toast.error("Kata laluan baharu mesti sekurang-kurangnya 6 aksara."); return; }
                    changePasswordMutation.mutate();
                  }}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Menukar..." : "Tukar Kata Laluan"}
                </Button>
                <Button variant="outline" onClick={() => { setChangingPassword(false); setPwd({ current: "", newPwd: "", confirm: "" }); }}>Batal</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setChangingPassword(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Tukar Kata Laluan
            </Button>
          )}
        </CardContent>
      </Card>

    </div>
  );
}