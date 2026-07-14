"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Plus, Edit, Trash2, UserPlus, KeyRound } from "lucide-react";
import type { Profile, Peranan } from "@/types";

const ROLES: Peranan[] = ["Pentadbir", "Penjaga Stor", "Kakitangan Farmasi", "Kakitangan Klinik"];

export default function PengurusanPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    nama: "", jawatan: "", peranan: "Kakitangan Farmasi" as Peranan, nama_pengguna: "", kata_laluan: "",
  });
  const [editData, setEditData] = useState<Partial<Profile>>({});

  const isAdmin = profile?.peranan === "Pentadbir";

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nama");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const addUserMutation = useMutation({
    mutationFn: async (user: typeof newUser) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${user.nama_pengguna}@quickrx.local`, password: user.kata_laluan,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal mencipta pengguna.");
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id, nama: user.nama, jawatan: user.jawatan || null,
        peranan: user.peranan, nama_pengguna: user.nama_pengguna,
      });
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      toast.success("Pengguna berjaya ditambah.");
      setOpenAdd(false);
      setNewUser({ nama: "", jawatan: "", peranan: "Kakitangan Farmasi", nama_pengguna: "", kata_laluan: "" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menambah pengguna."),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates, oldNamaPengguna }: { id: string; updates: Partial<Profile>; oldNamaPengguna?: string }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", id);
      if (error) throw error;
      if (updates.nama_pengguna && oldNamaPengguna && updates.nama_pengguna !== oldNamaPengguna) {
        await supabase.auth.admin.updateUserById(id, { email: `${updates.nama_pengguna}@quickrx.local` });
      }
    },
    onSuccess: () => { toast.success("Pengguna dikemaskini."); setEditId(null); queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => toast.error("Gagal mengemaskini pengguna."),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const { error } = await supabase.from("profiles").update({ aktif }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status pengguna dikemaskini."); queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => toast.error("Gagal mengemaskini status."),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal");
      }
    },
    onSuccess: () => toast.success("Kata laluan diset semula ke 'password123'."),
    onError: () => toast.error("Gagal menetapkan semula kata laluan. Sila cuba semula."),
  });

  if (!isAdmin) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Anda tidak mempunyai akses ke halaman ini.</p></div>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Pengurusan Pengguna" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengurusan Pengguna</h1>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" />Tambah Pengguna</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Pengguna Baharu</DialogTitle><DialogDescription>Cipta akaun pengguna baharu untuk sistem.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nama *</Label><Input value={newUser.nama} onChange={e => setNewUser({ ...newUser, nama: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nama Pengguna *</Label><Input value={newUser.nama_pengguna} onChange={e => setNewUser({ ...newUser, nama_pengguna: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kata Laluan *</Label><Input type="password" value={newUser.kata_laluan} onChange={e => setNewUser({ ...newUser, kata_laluan: e.target.value })} /></div>
              <div className="space-y-2"><Label>Jawatan</Label><Input value={newUser.jawatan} onChange={e => setNewUser({ ...newUser, jawatan: e.target.value })} /></div>
              <div className="space-y-2"><Label>Peranan *</Label>
                <Select value={newUser.peranan} onValueChange={v => setNewUser({ ...newUser, peranan: v as Peranan })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
              <Button onClick={() => addUserMutation.mutate(newUser)} disabled={!newUser.nama || !newUser.nama_pengguna || !newUser.kata_laluan || addUserMutation.isPending}>
                {addUserMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Senarai Pengguna</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Nama Pengguna</TableHead>
                <TableHead>Jawatan</TableHead>
                <TableHead>Peranan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuatkan...</TableCell></TableRow>
              ) : (
                users?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{editId === user.id ? <Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} className="h-7" /> : user.nama}</TableCell>
                    <TableCell className="font-mono">{editId === user.id ? <Input value={editData.nama_pengguna || ""} onChange={e => setEditData({ ...editData, nama_pengguna: e.target.value })} className="h-7" /> : user.nama_pengguna}</TableCell>
                    <TableCell>{editId === user.id ? <Input value={editData.jawatan || ""} onChange={e => setEditData({ ...editData, jawatan: e.target.value })} className="h-7" /> : user.jawatan || "-"}</TableCell>
                    <TableCell>{editId === user.id ? <Select value={editData.peranan || user.peranan} onValueChange={v => setEditData({ ...editData, peranan: v as Peranan })}><SelectTrigger className="h-7"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline">{user.peranan}</Badge>}</TableCell>
                    <TableCell><Badge variant={user.aktif ? "success" : "destructive"}>{user.aktif ? "Aktif" : "Tidak Aktif"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editId === user.id ? (
                          <>
                            <Button size="sm" onClick={() => updateUserMutation.mutate({ id: user.id, updates: editData, oldNamaPengguna: user.nama_pengguna })} disabled={updateUserMutation.isPending}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(user.id); setEditData(user); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleActiveMutation.mutate({ id: user.id, aktif: !user.aktif })}>{user.aktif ? <Trash2 className="h-3 w-3 text-destructive" /> : <Plus className="h-3 w-3 text-green-600" />}</Button>
                            {user.peranan !== "Pentadbir" && (
                              <Button size="sm" variant="ghost" onClick={() => resetPasswordMutation.mutate(user.id)} title="Reset password"><KeyRound className="h-3 w-3 text-yellow-500" /></Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}