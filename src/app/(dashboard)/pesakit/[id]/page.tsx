"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Breadcrumb, getNavSource } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, XCircle, Package, Merge, Trash2, ChevronDown, ChevronUp, ClipboardList, Activity, Search, ShieldAlert, User, Phone, MapPin, Calendar, FileText, Save, ArrowUpDown, Sparkles, IdCard, Hospital, Pill, BarChart3, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, ItemBatch, ItemForm } from "@/types";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: { key: string; dir: SortDir } | null; onSort: (k: string) => void }) {
  const active = currentSort?.key === sortKey;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (currentSort?.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <div className="h-3 w-3 opacity-0" />}
      </div>
    </TableHead>
  );
}

function FoldableCard({ title, count, defaultOpen = true, children, headerExtra }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode; headerExtra?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {count !== undefined && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
        </CardTitle>
        <div className="flex items-center gap-2">
          {headerExtra}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </CardHeader>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <CardContent className="pt-0">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const canEdit = hasPermission(profile?.peranan, "manage_patients");
  const canSupply = hasPermission(profile?.peranan, "manage_supply");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Patient>>({});
  const [openAddAssignment, setOpenAddAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ item_id: "", dos: "", tarikh_mula_guna: new Date().toISOString().split("T")[0] });
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openSupply, setOpenSupply] = useState<string | null>(null);
  const [supplyData, setSupplyData] = useState({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" });
  const [openMerge, setOpenMerge] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [openUpdateDose, setOpenUpdateDose] = useState<string | null>(null);
  const [doseUpdate, setDoseUpdate] = useState({ dos: "", catatan: "" });
  const [editSupplyRecord, setEditSupplyRecord] = useState<any>(null);
  const [openStopAssign, setOpenStopAssign] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [openDeleteSupply, setOpenDeleteSupply] = useState<any>(null);
  const [openDeactivate, setOpenDeactivate] = useState(false);
  const [assignmentSort, setAssignmentSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [doseSort, setDoseSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [supplySort, setSupplySort] = useState<{ key: string; dir: SortDir } | null>(null);

  const { data: patient, isLoading: patientLoading } = useQuery({ queryKey: ["patient", id], queryFn: async () => { const { data, error } = await supabase.from("patients").select("*").eq("id", id).single(); if (error) throw error; return data as Patient; } });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({ queryKey: ["assignments", id], queryFn: async () => { const { data, error } = await supabase.from("patient_item_assignments").select("*, item:items(*)").eq("patient_id", id).order("created_at", { ascending: false }); if (error) throw error; return data as (PatientItemAssignment & { item: Item })[]; } });
  const { data: forms } = useQuery({ queryKey: ["item_forms"], queryFn: async () => { const { data } = await supabase.from("item_forms").select("id, nama"); return (data || []) as Pick<ItemForm, "id" | "nama">[]; }, staleTime: 60000 });
  const formsMap = useMemo(() => { const map = new Map<string, string>(); forms?.forEach(f => map.set(f.id, f.nama)); return map; }, [forms]);
  const { data: items } = useQuery({ queryKey: ["items-with-stats"], queryFn: async () => { const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, id_bentuk, kuota").eq("aktif", true).order("nama_item"); if (error) throw error; const itemsList = data as any[]; const { data: counts } = await supabase.from("patient_item_assignments").select("item_id").eq("aktif", true); const m: Record<string, number> = {}; for (const c of (counts || [])) m[c.item_id] = (m[c.item_id] || 0) + 1; return itemsList.map(item => ({ ...item, patient_count: m[item.id] || 0, baki_kuota: item.kuota != null ? Math.max(0, item.kuota - (m[item.id] || 0)) : null })); } });
  const getItemDisplayName = useCallback((item: any) => { if (!item) return ""; const f = formsMap.get(item.id_bentuk) || ""; return [item.nama_item, item.kekuatan, f].filter(Boolean).join(" "); }, [formsMap]);
  const { data: doseHistory } = useQuery({ queryKey: ["dose-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data: d } = await supabase.from("dose_history").select("*").eq("assignment_id", expandedAssignment).order("tarikh", { ascending: false }); return d || []; }, enabled: !!expandedAssignment });
  const { data: supplyHistory } = useQuery({ queryKey: ["supply-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data, error } = await supabase.from("supply_records").select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)").eq("assignment_id", expandedAssignment).order("created_at", { ascending: false }); if (error) throw error; return data as any[]; }, enabled: !!expandedAssignment });

  const updatePatientMutation = useMutation({ mutationFn: async (updates: Partial<Patient>) => { const { error } = await supabase.from("patients").update(updates).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Maklumat dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); }, onError: () => toast.error("Gagal mengemaskini.") });
  const toggleActiveMutation = useMutation({ mutationFn: async ({ aktif }: { aktif: boolean }) => { const { error } = await supabase.from("patients").update({ aktif }).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Status dikemaskini."); setOpenDeactivate(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); } });
  const addAssignmentMutation = useMutation({ mutationFn: async (data: typeof newAssignment) => { const { error } = await supabase.from("patient_item_assignments").insert({ patient_id: id, item_id: data.item_id, dos: data.dos || null, tarikh_mula_guna: data.tarikh_mula_guna, dimulakan_oleh: profile?.id, kakitangan_farmasi_perekod: profile?.id }); if (error) throw error; }, onSuccess: () => { toast.success("Item ditambah."); setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["items-with-stats"] }); } });
  const stopAssignmentMutation = useMutation({ mutationFn: async ({ assignmentId, sebab }: { assignmentId: string; sebab: string }) => { const { error } = await supabase.from("patient_item_assignments").update({ tarikh_tamat_guna: new Date().toISOString().split("T")[0], ditamatkan_oleh: profile?.id, sebab_tamat: sebab, aktif: false }).eq("id", assignmentId); if (error) throw error; }, onSuccess: () => { toast.success("Item ditamatkan."); setOpenStopAssign(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const updateDoseMutation = useMutation({ mutationFn: async ({ assignmentId, dos }: { assignmentId: string; dos: string }) => { await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId); await supabase.from("dose_history").insert({ assignment_id: assignmentId, tarikh: new Date().toISOString().split("T")[0], dos, aktif: true, dikemaskini_oleh: profile?.id }); }, onSuccess: () => { toast.success("Dos dikemaskini."); setOpenUpdateDose(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const { data: availableBatches } = useQuery({ queryKey: ["batches", openSupply], queryFn: async () => { if (!openSupply) return []; const a = assignments?.find(x => x.id === openSupply); if (!a) return []; const { data, error } = await supabase.from("item_batches").select("*").eq("item_id", a.item_id).gt("kuantiti", 0).gte("tarikh_luput", new Date().toISOString().split("T")[0]).order("tarikh_luput"); if (error) throw error; return data as ItemBatch[]; }, enabled: !!openSupply });
  const supplyMutation = useMutation({ mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => { const res = await fetch("/api/supply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, dos: data.dos, tempoh_dibekal: `${data.tempoh_nilai} ${data.tempoh_unit}`, kakitangan_pembekal: profile?.id }) }); if (!res.ok) { const r = await res.json(); throw new Error(r.error); } }, onSuccess: () => { toast.success("Bekalan direkodkan."); setOpenSupply(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const deleteSupplyMutation = useMutation({ mutationFn: async (sid: string) => { await supabase.from("supply_records").delete().eq("id", sid); }, onSuccess: () => { toast.success("Rekod dipadam."); setOpenDeleteSupply(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });
  const saveEditSupplyMutation = useMutation({ mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: any }) => { await supabase.from("supply_records").update({ dos: updates.dos, tempoh_dibekal: updates.tempoh_dibekal, kuantiti: parseInt(updates.kuantiti), catatan_bekalan: updates.catatan_bekalan || null }).eq("id", supplyId); }, onSuccess: () => { toast.success("Dikemaskini."); setEditSupplyRecord(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });

  const sortData = (data: any[], sort: { key: string; dir: SortDir } | null) => { if (!sort) return data; return [...data].sort((a, b) => { const cmp = (a[sort.key] || "").toString().localeCompare((b[sort.key] || "").toString(), "ms"); return sort.dir === "asc" ? cmp : -cmp; }); };
  const toggleSort = (sort: any, setSort: any, key: string) => { setSort(sort?.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }); };
  const sortedAssignments = useMemo(() => {
    const sorted = sortData(assignments || [], assignmentSort);
    // Always put aktif items at top, ditamatkan at bottom
    return [...sorted].sort((a: any, b: any) => (a.aktif === b.aktif ? 0 : a.aktif ? -1 : 1));
  }, [assignments, assignmentSort]);
  const pagedAssignments = useMemo(() => sortedAssignments.slice(assignmentPage * PAGE_SIZE, (assignmentPage + 1) * PAGE_SIZE), [sortedAssignments, assignmentPage]);
  const totalPages = Math.ceil((sortedAssignments.length || 0) / PAGE_SIZE);
  const sortedDoseHistory = useMemo(() => sortData(doseHistory || [], doseSort), [doseHistory, doseSort]);
  const sortedSupplyHistory = useMemo(() => sortData(supplyHistory || [], supplySort), [supplyHistory, supplySort]);
  const filteredItems = (items || []).filter((item: any) => !itemSearch || item.nama_item.toLowerCase().includes(itemSearch.toLowerCase()));
  const totalCount = assignments?.length || 0;
  const activeCount = useMemo(() => (assignments || []).filter(a => a.aktif).length, [assignments]);
  const totalSupplies = useMemo(() => {
    if (!assignments) return 0;
    return assignments.length;
  }, [assignments]);

  if (patientLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid rgba(24, 119, 242, 0.15)", borderTopColor: "#1877f2", borderRadius: "50%", margin: "0 auto 12px", WebkitAnimation: "spin 1s linear infinite", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan...</p>
        <style>{`@-webkit-keyframes spin{from{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
  if (!patient) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <p style={{ color: "#65676b" }}>Pesakit tidak dijumpai.</p>
    </div>
  );

  const currentAssignment = openSupply ? assignments?.find(a => a.id === openSupply) : null;
  const toggleExpand = (aid: string) => { setExpandedAssignment(expandedAssignment === aid ? null : aid); };

  return (
    <div className="space-y-6" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(24, 119, 242, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <div className="flex items-center justify-between">
        <Breadcrumb items={(() => { const source = getNavSource(); if (source?.startsWith("stok:")) { const n = source.replace("stok:", ""); return [{ label: "Inventori", href: "/stok" }, ...(n ? [{ label: n }] : []), { label: patient.nama }]; } return [{ label: "Pesakit", href: "/pesakit" }, { label: patient.nama }]; })()} />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button onClick={() => router.push("/pesakit")} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(24, 119, 242, 0.15)", background: "rgba(24, 119, 242, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0 }}>
          <ArrowLeft size={20} color="#1877f2" />
        </button>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>Butiran Pesakit</h1>
      </motion.div>

      {/* 1. Patient Info Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <FoldableCard
          title={patient.nama}
          defaultOpen={true}
          headerExtra={
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Badge variant={patient.aktif ? "success" : "destructive"}>{patient.aktif ? "Aktif" : "Tidak Aktif"}</Badge>
              {canEdit && <Button variant="outline" size="sm" onClick={() => setOpenMerge(true)}><Merge className="mr-2 h-4 w-4" /> Gabung</Button>}
              {canEdit && !editMode && <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditData(patient); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
              {canEdit && <Button variant={patient.aktif ? "destructive" : "default"} size="sm" onClick={() => setOpenDeactivate(true)}>{patient.aktif ? "Nyahaktif" : "Aktifkan"}</Button>}
            </div>
          }
        >
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama</Label><Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. KP</Label><Input value={editData.nombor_kad_pengenalan || ""} onChange={e => setEditData({ ...editData, nombor_kad_pengenalan: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. Telefon</Label><Input value={editData.nombor_telefon || ""} onChange={e => setEditData({ ...editData, nombor_telefon: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. Hospital</Label><Input value={editData.nombor_pendaftaran_hospital || ""} onChange={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Alamat</Label><Textarea value={editData.alamat || ""} onChange={e => setEditData({ ...editData, alamat: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button onClick={() => updatePatientMutation.mutate(editData)} disabled={updatePatientMutation.isPending}>
                  {updatePatientMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                <div><span className="text-muted-foreground">No. KP:</span> {patient.nombor_kad_pengenalan || "-"}</div>
                <div><span className="text-muted-foreground">No. Hospital:</span> {patient.nombor_pendaftaran_hospital || "-"}</div>
                <div><span className="text-muted-foreground">No. Telefon:</span> {patient.nombor_telefon || "-"}</div>
                <div><span className="text-muted-foreground">Tarikh Daftar:</span> {formatDate(patient.created_at)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> {patient.alamat || "-"}</div>
                {patient.catatan && <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> {patient.catatan}</div>}
              </div>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100"><Pill className="h-5 w-5 text-blue-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Jumlah Item</p><p className="text-lg font-bold">{totalCount}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><Activity className="h-5 w-5 text-emerald-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Item Aktif</p><p className="text-lg font-bold">{activeCount}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100"><Users className="h-5 w-5 text-purple-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><p className="text-lg font-bold">{patient.aktif ? "Aktif" : "Tidak"}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Calendar className="h-5 w-5 text-amber-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Daftar</p><p className="text-sm font-bold">{formatDate(patient.created_at)}</p></div>
                </div>
              </div>
            </>
          )}
        </FoldableCard>
      </motion.div>

      {/* Deactivate Dialog */}
      <Dialog open={openDeactivate} onOpenChange={setOpenDeactivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="h-5 w-5" /> Nyahaktifkan Pesakit</DialogTitle>
            <DialogDescription>Anda akan menyahaktifkan pesakit ini. Tindakan ini boleh dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeactivate(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => toggleActiveMutation.mutate({ aktif: false })} disabled={toggleActiveMutation.isPending}>
              {toggleActiveMutation.isPending ? "Menyahaktif..." : "Ya, Nyahaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Item Assignments Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <FoldableCard
          title="Item Didaftarkan"
          count={totalCount}
          defaultOpen={true}
          headerExtra={
            patient.aktif && canEdit ? (
              <Dialog open={openAddAssignment} onOpenChange={(v) => { setOpenAddAssignment(v); if (!v) { setSelectedItemId(null); setItemSearch(""); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={e => e.stopPropagation()}><Plus className="mr-1 h-3.5 w-3.5" />Tambah Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Tambah Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Cari item..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="pl-8" />
                    </div>
                    <div className="max-h-[240px] overflow-auto rounded-lg border">
                      {(items || []).filter((i: any) => !itemSearch || i.nama_item.toLowerCase().includes(itemSearch.toLowerCase())).map((item: any) => (
                        <div key={item.id} onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)} className="p-3 border-b last:border-b-0 cursor-pointer transition-colors" style={{ background: selectedItemId === item.id ? "rgba(24, 119, 242, 0.06)" : "transparent" }}>
                          <div className="font-medium text-sm">{item.nama_item} {item.kekuatan}</div>
                          <div className="text-xs text-muted-foreground">{item.kod_item} | Baki: {item.baki_kuota ?? "-"}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2"><Label>Dos</Label><Input value={newAssignment.dos} onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })} placeholder="cth: 1 biji 2x sehari" /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenAddAssignment(false)}>Batal</Button>
                    <Button onClick={() => { if (selectedItemId) addAssignmentMutation.mutate({ ...newAssignment, item_id: selectedItemId }); }} disabled={!selectedItemId || addAssignmentMutation.isPending}>
                      {addAssignmentMutation.isPending ? "Menambah..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        >
          {pagedAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tiada item didaftarkan.</p>
          ) : (
            <div className="space-y-1">
              {pagedAssignments.map((a: any) => (
                <div key={a.id} className="rounded-lg border overflow-hidden">
                  <div onClick={() => toggleExpand(a.id)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: a.aktif ? "rgba(24, 119, 242, 0.1)" : "rgba(107, 114, 128, 0.1)" }}>
                        <Pill className="h-4 w-4" style={{ color: a.aktif ? "#1877f2" : "#6b7280" }} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{getItemDisplayName(a.item)}</div>
                        <div className="text-xs text-muted-foreground">{a.dos || "Tiada dos"} &middot; {formatDate(a.tarikh_mula_guna)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.aktif ? "success" : "secondary"} className="text-[10px]">{a.aktif ? "Aktif" : "Tamat"}</Badge>
                      <motion.div animate={{ rotate: expandedAssignment === a.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedAssignment === a.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1 border-t bg-muted/30">
                          <div className="flex gap-2 mb-3">
                            {a.aktif && <Button size="sm" onClick={() => setOpenSupply(a.id)}><Package className="mr-1 h-3.5 w-3.5" /> Bekal</Button>}
                            {a.aktif && <Button size="sm" variant="outline" onClick={() => { setOpenUpdateDose(a.id); setDoseUpdate({ dos: a.dos || "", catatan: "" }); }}><Edit className="mr-1 h-3.5 w-3.5" /> Kemaskini Dos</Button>}
                            {canEdit && a.aktif && <Button size="sm" variant="destructive" onClick={() => { setOpenStopAssign(a.id); setStopReason(""); }}><XCircle className="mr-1 h-3.5 w-3.5" /> Tamatkan</Button>}
                          </div>

                          {/* Dose History */}
                          <FoldableCard title="Sejarah Dos" count={doseHistory?.length || 0} defaultOpen={false}>
                            {sortedDoseHistory.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <SortableHeader label="Tarikh" sortKey="tarikh" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                    <SortableHeader label="Dos" sortKey="dos" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortedDoseHistory.map((d: any) => (
                                    <TableRow key={d.id}>
                                      <TableCell className="text-xs">{formatDate(d.tarikh)}</TableCell>
                                      <TableCell className="text-xs">{d.dos}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground py-2">Tiada sejarah dos.</p>
                            )}
                          </FoldableCard>

                          {/* Supply History */}
                          <div className="mt-2">
                            <FoldableCard title="Sejarah Bekalan" count={supplyHistory?.length || 0} defaultOpen={false}>
                              {sortedSupplyHistory.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <SortableHeader label="Tarikh" sortKey="tarikh_dibekal" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                      <SortableHeader label="Kuantiti" sortKey="kuantiti" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                      <SortableHeader label="Kelompok" sortKey="batch" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                      <TableHead>Tindakan</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortedSupplyHistory.map((r: any) => (
                                      <TableRow key={r.id}>
                                        <TableCell className="text-xs">{formatDate(r.tarikh_dibekal)}</TableCell>
                                        <TableCell className="text-xs">{r.kuantiti}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{r.batch?.nombor_kelompok || "-"}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setEditSupplyRecord({ ...r, editDos: r.dos, editKuantiti: r.kuantiti, editTempoh: r.tempoh_dibekal })}><Edit className="h-3 w-3" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setOpenDeleteSupply(r)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">Tiada sejarah bekalan.</p>
                              )}
                            </FoldableCard>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="flex justify-center gap-1 pt-4">
                  <Button size="sm" variant="outline" disabled={assignmentPage === 0} onClick={() => setAssignmentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button key={i} size="sm" variant={i === assignmentPage ? "default" : "outline"} onClick={() => setAssignmentPage(i)}>{i + 1}</Button>
                  ))}
                  <Button size="sm" variant="outline" disabled={assignmentPage >= totalPages - 1} onClick={() => setAssignmentPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          )}
        </FoldableCard>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={!!openStopAssign} onOpenChange={() => setOpenStopAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> Tamatkan Item</DialogTitle>
            <DialogDescription>Pilih sebab penamatan item ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Sebab Tamat</Label>
            <Select value={stopReason} onValueChange={setStopReason}>
              <SelectTrigger><SelectValue placeholder="Pilih sebab" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tukar kepada item lain">Tukar kepada item lain</SelectItem>
                <SelectItem value="Pesakit tamat rawatan">Pesakit tamat rawatan</SelectItem>
                <SelectItem value="Pesakit tidak datang">Pesakit tidak datang</SelectItem>
                <SelectItem value="Reaksi buruk / alahan">Reaksi buruk / alahan</SelectItem>
                <SelectItem value="Atas nasihat doktor">Atas nasihat doktor</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStopAssign(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (openStopAssign && stopReason) stopAssignmentMutation.mutate({ assignmentId: openStopAssign, sebab: stopReason }); }} disabled={!stopReason || stopAssignmentMutation.isPending}>
              {stopAssignmentMutation.isPending ? "Menamatkan..." : "Ya, Tamatkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openDeleteSupply} onOpenChange={() => setOpenDeleteSupply(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Padam Rekod</DialogTitle>
            <DialogDescription>Anda pasti mahu memadam rekod bekalan ini? Tindakan ini tidak boleh dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteSupply(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (openDeleteSupply) deleteSupplyMutation.mutate(openDeleteSupply.id); }} disabled={deleteSupplyMutation.isPending}>
              {deleteSupplyMutation.isPending ? "Memadam..." : "Padamkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplyRecord} onOpenChange={() => setEditSupplyRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Edit Rekod</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Dos</Label><Input value={editSupplyRecord?.editDos ?? editSupplyRecord?.dos} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editDos: e.target.value })} /></div>
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={editSupplyRecord?.editKuantiti ?? editSupplyRecord?.kuantiti} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplyRecord(null)}>Batal</Button>
            <Button onClick={() => { if (editSupplyRecord) saveEditSupplyMutation.mutate({ supplyId: editSupplyRecord.id, updates: { dos: editSupplyRecord.editDos ?? editSupplyRecord.dos, tempoh_dibekal: editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal, kuantiti: editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti, catatan_bekalan: "" } }); }} disabled={saveEditSupplyMutation.isPending}>
              {saveEditSupplyMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openUpdateDose} onOpenChange={() => setOpenUpdateDose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Kemaskini Dos</DialogTitle>
            <DialogDescription>Masukkan dos baharu untuk pesakit ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Dos Baru</Label>
            <Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} placeholder="cth: 1 biji 2x sehari" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdateDose(null)}>Batal</Button>
            <Button onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos }); }} disabled={updateDoseMutation.isPending}>
              {updateDoseMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Bekal Ubat</DialogTitle>
            <DialogDescription>Rekodkan bekalan ubat untuk pesakit ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Dos Semasa</Label><Input value={currentAssignment?.dos || "-"} readOnly className="opacity-60" /></div>
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSupply(null)}>Batal</Button>
            <Button onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply, dos: currentAssignment.dos || "" }); }} disabled={supplyMutation.isPending}>
              {supplyMutation.isPending ? "Membekal..." : "Bekal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}
    </div>
  );
}