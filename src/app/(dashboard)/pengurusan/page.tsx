"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, UserPlus, KeyRound, ChevronDown, ChevronUp, ShieldAlert, UserCheck, UserX, Lock, AlertTriangle, BellRing, CheckCircle2, XCircle, History, RefreshCw, Users, MailQuestion, BookOpen } from "lucide-react";
import { LookupManager } from "@/components/pengurusan/lookup-manager";
import type { Profile, Peranan } from "@/types";

const ROLES: Peranan[] = ["Pentadbir", "Penjaga Stor", "Kakitangan Farmasi", "Kakitangan Klinik"];

interface ResetRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  user?: { nama: string; nama_pengguna: string };
}

export default function PengurusanPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [openAdd, setOpenAdd] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    nama: "", jawatan: "", peranan: "Kakitangan Farmasi" as Peranan, nama_pengguna: "", kata_laluan: "",
  });
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; newStatus: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState<{ id: string; name: string; nama_pengguna: string } | null>(null);

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
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: user.nama,
          nama_pengguna: user.nama_pengguna,
          kata_laluan: user.kata_laluan,
          jawatan: user.jawatan || null,
          peranan: user.peranan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencipta pengguna.");
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
    onSuccess: () => { toast.success("Pengguna dikemaskini."); setEditId(null); setExpandedUser(null); queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => toast.error("Gagal mengemaskini pengguna."),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const { error } = await supabase.from("profiles").update({ aktif }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status pengguna dikemaskini."); setConfirmToggle(null); queryClient.invalidateQueries({ queryKey: ["users"] }); },
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
    onSuccess: () => { toast.success("Kata laluan diset semula ke 'password123'."); setConfirmReset(null); },
    onError: () => toast.error("Gagal menetapkan semula kata laluan. Sila cuba semula."),
  });

  const toggleExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setEditId(null);
    } else {
      setExpandedUser(userId);
      setEditId(null);
    }
  };

  // Reset requests
  const { data: resetRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["reset-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*, user:profiles!password_reset_requests_user_id_fkey(nama, nama_pengguna)")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: isAdmin,
  });

  const resolveRequestMutation = useMutation({
    mutationFn: async ({ requestId, newStatus }: { requestId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("password_reset_requests")
        .update({ status: newStatus, resolved_by: profile?.id, resolved_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permintaan dikemaskini."); queryClient.invalidateQueries({ queryKey: ["reset-requests"] }); },
    onError: () => toast.error("Gagal mengemaskini permintaan."),
  });

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <p style={{ fontSize: "14px", color: "#65676b" }}>Anda tidak mempunyai akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(6, 182, 212, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />
      <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Pengurusan Pengguna" }]} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap" as const, gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)", flexShrink: 0 }}>
            <Users size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21" }}>Pengurusan Pengguna</h1>
            <p style={{ fontSize: "13px", color: "#65676b" }}>Urus pengguna dan tetapan sistem</p>
          </div>
        </div>
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MailQuestion className="h-4 w-4" /> Permintaan Reset
            {resetRequests.filter((r: any) => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{resetRequests.filter((r: any) => r.status === "pending").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lookups" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Rujukan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Senarai Pengguna</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                {isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Memuatkan...</div>
                ) : users?.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">Tiada pengguna didaftarkan.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Nama Pengguna</TableHead>
                        <TableHead>Jawatan</TableHead>
                        <TableHead>Peranan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user, idx) => (
                        <React.Fragment key={user.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors border-b"
                            style={{ backgroundColor: expandedUser === user.id ? "#f0f0f0" : ["#ffffff", "#f8f8f8"][idx % 2] }}
                            onClick={() => toggleExpand(user.id)}
                          >
                            <TableCell><motion.div animate={{ rotate: expandedUser === user.id ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="h-4 w-4 text-muted-foreground" /></motion.div></TableCell>
                            <TableCell className="font-medium">{user.nama}</TableCell>
                            <TableCell className="font-mono text-sm">{user.nama_pengguna}</TableCell>
                            <TableCell>{user.jawatan || "-"}</TableCell>
                            <TableCell><Badge variant="outline">{user.peranan}</Badge></TableCell>
                            <TableCell><Badge variant={user.aktif ? "success" : "destructive"}>{user.aktif ? "Aktif" : "Tidak Aktif"}</Badge></TableCell>
                          </TableRow>
                          <AnimatePresence>
                            {expandedUser === user.id && (
                              <motion.tr initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <td colSpan={6} className="p-0"><div className="px-6 py-5 bg-accent/20 border-t border-border space-y-5">{/* Detail Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div><span className="text-muted-foreground">Nama Pengguna:</span><p className="font-medium mt-0.5">{user.nama_pengguna}</p></div>
                                  <div><span className="text-muted-foreground">Didaftarkan:</span><p className="font-medium mt-0.5">{new Date(user.created_at).toLocaleDateString("ms-MY", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                                  <div><span className="text-muted-foreground">Kemaskini:</span><p className="font-medium mt-0.5">{new Date(user.updated_at).toLocaleDateString("ms-MY", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                                </div>
                                <AnimatePresence mode="wait">
                                  {editId === user.id ? (
                                    <motion.div key="edit" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-4 border rounded-lg p-4 bg-white">
                                      <p className="text-sm font-semibold mb-2">✏️ Kemaskini Maklumat Pengguna</p>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label className="text-xs">Nama</Label><Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} className="h-8 text-sm" /></div>
                                        <div className="space-y-2"><Label className="text-xs">Nama Pengguna</Label><Input value={editData.nama_pengguna || ""} onChange={e => setEditData({ ...editData, nama_pengguna: e.target.value })} className="h-8 text-sm" /></div>
                                        <div className="space-y-2"><Label className="text-xs">Jawatan</Label><Input value={editData.jawatan || ""} onChange={e => setEditData({ ...editData, jawatan: e.target.value })} className="h-8 text-sm" /></div>
                                        <div className="space-y-2"><Label className="text-xs">Peranan</Label><Select value={editData.peranan || user.peranan} onValueChange={v => setEditData({ ...editData, peranan: v as Peranan })}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                                      </div>
                                      <div className="flex gap-2 justify-end"><Button size="sm" variant="outline" onClick={() => setEditId(null)}>Batal</Button><Button size="sm" onClick={() => updateUserMutation.mutate({ id: user.id, updates: editData, oldNamaPengguna: user.nama_pengguna })} disabled={updateUserMutation.isPending}>{updateUserMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}</Button></div>
                                    </motion.div>
                                  ) : (
                                    <motion.div key="actions" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-wrap gap-2 items-center">
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditId(user.id); setEditData(user); }}><Edit className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                                      <Button size="sm" variant={user.aktif ? "destructive" : "default"} onClick={(e) => { e.stopPropagation(); setConfirmToggle({ id: user.id, name: user.nama, newStatus: !user.aktif }); }}>{user.aktif ? <><UserX className="mr-1.5 h-3.5 w-3.5" /> Nyahaktif</> : <><UserCheck className="mr-1.5 h-3.5 w-3.5" /> Aktif</>}</Button>
                                      {user.peranan !== "Pentadbir" && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmReset({ id: user.id, name: user.nama, nama_pengguna: user.nama_pengguna }); }} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset</Button>}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div></td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dialogs */}
          <Dialog open={!!confirmToggle} onOpenChange={() => setConfirmToggle(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />{confirmToggle?.newStatus ? "Aktifkan Pengguna" : "Nyahaktifkan Pengguna"}</DialogTitle>
                <DialogDescription>Anda akan {confirmToggle?.newStatus ? "mengaktifkan semula" : "menyahaktifkan"} pengguna berikut:</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 border rounded-md p-4"><p className="font-semibold text-lg">{confirmToggle?.name}</p></div>
                {!confirmToggle?.newStatus && <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm"><p className="font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Amaran</p><ul className="list-disc list-inside space-y-1 text-red-600 text-xs"><li>Pengguna tidak akan dapat log masuk</li><li>Data akan kekal dalam pangkalan data</li><li>Boleh diaktifkan semula bila-bila masa</li></ul></div>}
                {confirmToggle?.newStatus && <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-sm"><p className="font-semibold text-emerald-700 flex items-center gap-2"><UserCheck className="h-4 w-4" /> Pengaktifan Semula</p><ul className="list-disc list-inside space-y-1 text-emerald-600 text-xs"><li>Pengguna akan dapat log masuk semula</li><li>Semua data dan peranan kekal tidak berubah</li></ul></div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmToggle(null)}>Batal</Button>
                <Button variant={confirmToggle?.newStatus ? "default" : "destructive"} onClick={() => { if (confirmToggle) toggleActiveMutation.mutate({ id: confirmToggle.id, aktif: confirmToggle.newStatus }); }} disabled={toggleActiveMutation.isPending}>{toggleActiveMutation.isPending ? "Memproses..." : confirmToggle?.newStatus ? "Ya, Aktifkan" : "Ya, Nyahaktifkan"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!confirmReset} onOpenChange={() => setConfirmReset(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-amber-600" /> Reset Kata Laluan</DialogTitle>
                <DialogDescription>Anda akan menetapkan semula kata laluan untuk pengguna berikut:</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 border rounded-md p-4 space-y-2"><p className="font-semibold text-lg">{confirmReset?.name}</p><p className="text-sm text-muted-foreground">Nama Pengguna: <span className="font-mono font-medium text-foreground">{confirmReset?.nama_pengguna}</span></p></div>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm"><p className="font-semibold text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Maklumat Penting</p><ul className="list-disc list-inside space-y-1 text-amber-600 text-xs"><li>Kata laluan akan ditetapkan semula kepada <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">password123</code></li><li>Pengguna akan dipaksa log masuk semula</li><li>Tindakan ini tidak boleh dibatalkan</li></ul></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmReset(null)}>Batal</Button>
                <Button variant="default" className="bg-amber-600 hover:bg-amber-700" onClick={() => { if (confirmReset) resetPasswordMutation.mutate(confirmReset.id); }} disabled={resetPasswordMutation.isPending}>{resetPasswordMutation.isPending ? "Menetapkan semula..." : "Ya, Set Semula"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MailQuestion className="h-5 w-5 text-amber-500" /> Permintaan Reset Kata Laluan</CardTitle></CardHeader>
            <CardContent>
              {loadingRequests ? <p className="text-muted-foreground text-sm">Memuatkan...</p> : resetRequests.length === 0 ? <p className="text-muted-foreground text-sm">Tiada permintaan.</p> : (
                <div className="space-y-3">
                  {resetRequests.map((req: any) => (
                    <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${req.status === "pending" ? "border-amber-300 bg-amber-50/50" : "bg-muted/30"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{req.user?.nama || "?"}</p>
                          <Badge variant={req.status === "pending" ? "destructive" : req.status === "approved" ? "outline" : "secondary"}>{req.status === "pending" ? "Menunggu" : req.status === "approved" ? "Disahkan" : "Ditolak"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{req.user?.nama_pengguna} &middot; {new Date(req.requested_at).toLocaleString("ms-MY")}</p>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { resolveRequestMutation.mutate({ requestId: req.id, newStatus: "approved" }); resetPasswordMutation.mutate(req.user_id); }} disabled={resolveRequestMutation.isPending}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Sah & Reset</Button>
                          <Button size="sm" variant="outline" onClick={() => resolveRequestMutation.mutate({ requestId: req.id, newStatus: "rejected" })} disabled={resolveRequestMutation.isPending}><XCircle className="h-3.5 w-3.5 mr-1" /> Tolak</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lookups" className="space-y-4">
          <h2 className="text-lg font-semibold">Rujukan Sistem</h2>
          <p className="text-sm text-muted-foreground">Urus senarai rujukan untuk kategori item, bentuk dos, dan durasi bekalan.</p>
          <LookupManager type="item_categories" />
          <LookupManager type="item_forms" />
          <LookupManager type="supply_durations" />
        </TabsContent>
      </Tabs>
      {/* Style overrides for glassmorphism */}
      <style>{`
        @-webkit-keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @media (max-width: 768px) {
          .pengurusan-content > div:first-child > div { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
}
