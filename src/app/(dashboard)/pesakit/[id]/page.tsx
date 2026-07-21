"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { formatDate, toTitleCase, formatMyKad, formatPhone } from "@/lib/utils";
import { Breadcrumb, getNavSource } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, XCircle, Package, Merge, Trash2, ChevronDown, ChevronUp, Activity, Search, ShieldAlert, Calendar, Sparkles, Pill, Users, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [newAssignment, setNewAssignment] = useState({ item_id: "", dos: "", tarikh_mula_guna: new Date().toISOString().split("T")[0], catatan_penggunaan: "" });
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { data: patient, isLoading: patientLoading } = useQuery({ queryKey: ["patient", id], queryFn: async () => { const { data, error } = await supabase.from("patients").select("*").eq("id", id).single(); if (error) throw error; return data as Patient; } });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({ queryKey: ["assignments", id], queryFn: async () => { const { data, error } = await supabase.from("patient_item_assignments").select("*, item:items(*), dimulakan:profiles!dimulakan_oleh(nama), ditamatkan:profiles!ditamatkan_oleh(nama), perekod:profiles!kakitangan_farmasi_perekod(nama)").eq("patient_id", id).order("created_at", { ascending: false }); if (error) throw error; return data as any[]; } });
  const { data: forms } = useQuery({ queryKey: ["item_forms"], queryFn: async () => { const { data } = await supabase.from("item_forms").select("id, nama"); return (data || []) as Pick<ItemForm, "id" | "nama">[]; }, staleTime: 60000 });
  const formsMap = useMemo(() => { const map = new Map<string, string>(); forms?.forEach(f => map.set(f.id, f.nama)); return map; }, [forms]);
  const { data: items } = useQuery({ queryKey: ["items-with-stats"], queryFn: async () => { const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, id_bentuk, kuota").eq("aktif", true).order("nama_item"); if (error) throw error; const itemsList = data as any[]; const { data: counts } = await supabase.from("patient_item_assignments").select("item_id").eq("aktif", true); const m: Record<string, number> = {}; for (const c of (counts || [])) m[c.item_id] = (m[c.item_id] || 0) + 1; return itemsList.map(item => ({ ...item, patient_count: m[item.id] || 0, baki_kuota: item.kuota != null ? Math.max(0, item.kuota - (m[item.id] || 0)) : null })); } });
  const getItemDisplayName = useCallback((item: any) => { if (!item) return ""; const f = formsMap.get(item.id_bentuk) || ""; return [item.nama_item, item.kekuatan, f].filter(Boolean).join(" "); }, [formsMap]);
  const activeItemIds = useMemo(() => new Set((assignments || []).filter((a: any) => a.aktif).map((a: any) => a.item_id)), [assignments]);
  const { data: doseHistory } = useQuery({ queryKey: ["dose-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data: d } = await supabase.from("dose_history").select("*, staff:profiles!dikemaskini_oleh(nama)").eq("assignment_id", expandedAssignment).order("tarikh", { ascending: false }); return d || []; }, enabled: !!expandedAssignment });
  const { data: supplyHistory } = useQuery({ queryKey: ["supply-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data, error } = await supabase.from("supply_records").select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)").eq("assignment_id", expandedAssignment).order("created_at", { ascending: false }); if (error) throw error; return data as any[]; }, enabled: !!expandedAssignment });
  const { data: durations } = useQuery({ queryKey: ["supply_durations"], queryFn: async () => { const { data } = await supabase.from("supply_durations").select("*").order("nama"); return (data || []) as { nama: string }[]; }, staleTime: 300000 });

  const updatePatientMutation = useMutation({ mutationFn: async (updates: Partial<Patient>) => { const { error } = await supabase.from("patients").update(updates).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Maklumat dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); }, onError: () => toast.error("Gagal mengemaskini.") });
  const toggleActiveMutation = useMutation({ mutationFn: async ({ aktif }: { aktif: boolean }) => { const { error } = await supabase.from("patients").update({ aktif }).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Status dikemaskini."); setOpenDeactivate(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const addAssignmentMutation = useMutation({ mutationFn: async (data: typeof newAssignment) => { const { data: inserted, error } = await supabase.from("patient_item_assignments").insert({ patient_id: id, item_id: data.item_id, dos: data.dos || null, tarikh_mula_guna: data.tarikh_mula_guna, catatan_penggunaan: data.catatan_penggunaan || null, dimulakan_oleh: profile?.id, kakitangan_farmasi_perekod: profile?.id }).select("id"); if (error) throw error; if (data.dos && inserted?.[0]?.id) { const { error: dhError } = await supabase.from("dose_history").insert({ assignment_id: inserted[0].id, tarikh: new Date().toISOString().split("T")[0], dos: data.dos, aktif: true, dikemaskini_oleh: profile?.id }); if (dhError) throw dhError; } }, onSuccess: () => { toast.success("Item ditambah."); setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["items-with-stats"] }); } });
  const stopAssignmentMutation = useMutation({ mutationFn: async ({ assignmentId, sebab }: { assignmentId: string; sebab: string }) => { const { error } = await supabase.from("patient_item_assignments").update({ tarikh_tamat_guna: new Date().toISOString().split("T")[0], ditamatkan_oleh: profile?.id, sebab_tamat: sebab, aktif: false }).eq("id", assignmentId); if (error) throw error; }, onSuccess: () => { toast.success("Item ditamatkan."); setOpenStopAssign(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const updateDoseMutation = useMutation({ mutationFn: async ({ assignmentId, dos }: { assignmentId: string; dos: string }) => { await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId); await supabase.from("dose_history").insert({ assignment_id: assignmentId, tarikh: new Date().toISOString().split("T")[0], dos, aktif: true, dikemaskini_oleh: profile?.id }); }, onSuccess: () => { toast.success("Dos dikemaskini."); setOpenUpdateDose(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["dose-history", expandedAssignment] }); } });
  const { data: availableBatches } = useQuery({ queryKey: ["batches", openSupply], queryFn: async () => { if (!openSupply) return []; const a = assignments?.find(x => x.id === openSupply); if (!a) return []; const { data, error } = await supabase.from("item_batches").select("*").eq("item_id", a.item_id).gt("kuantiti", 0).gte("tarikh_luput", new Date().toISOString().split("T")[0]).order("tarikh_luput"); if (error) throw error; return data as ItemBatch[]; }, enabled: !!openSupply });
  useEffect(() => {
    if (availableBatches && availableBatches.length > 0 && !supplyData.batch_id) {
      setSupplyData(prev => ({ ...prev, batch_id: availableBatches[0].id }));
    }
  }, [availableBatches]);
  const supplyMutation = useMutation({ mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => { const res = await fetch("/api/supply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, dos: data.dos, tempoh_dibekal: `${data.tempoh_nilai} ${data.tempoh_unit}`, kakitangan_pembekal: profile?.id }) }); if (!res.ok) { const r = await res.json(); throw new Error(r.error); } }, onSuccess: () => { toast.success("Bekalan direkodkan."); setOpenSupply(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); }, onError: (e: any) => toast.error(e.message || "Gagal membekal.") });
  const deleteSupplyMutation = useMutation({ mutationFn: async (sid: string) => { await supabase.from("supply_records").delete().eq("id", sid); }, onSuccess: () => { toast.success("Rekod dipadam."); setOpenDeleteSupply(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });
  const saveEditSupplyMutation = useMutation({ mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: any }) => { await supabase.from("supply_records").update({ dos: updates.dos, tempoh_dibekal: updates.tempoh_dibekal, kuantiti: parseInt(updates.kuantiti), catatan_bekalan: updates.catatan_bekalan || null }).eq("id", supplyId); }, onSuccess: () => { toast.success("Dikemaskini."); setEditSupplyRecord(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });

  const sortData = (data: any[], sort: { key: string; dir: SortDir } | null) => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const getVal = (obj: any, key: string) => key.split(".").reduce((o, k) => (o || {})[k], obj);
      const cmp = (getVal(a, sort.key) || "").toString().localeCompare((getVal(b, sort.key) || "").toString(), "ms");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  };
  const toggleSort = (sort: any, setSort: any, key: string) => { setSort(sort?.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }); };
  const sortedAssignments = useMemo(() => {
    const sorted = sortData(assignments || [], assignmentSort);
    return [...sorted].sort((a: any, b: any) => (a.aktif === b.aktif ? 0 : a.aktif ? -1 : 1));
  }, [assignments, assignmentSort]);
  const pagedAssignments = useMemo(() => sortedAssignments.slice(assignmentPage * PAGE_SIZE, (assignmentPage + 1) * PAGE_SIZE), [sortedAssignments, assignmentPage]);
  const totalPages = Math.ceil((sortedAssignments.length || 0) / PAGE_SIZE);
  const sortedDoseHistory = useMemo(() => sortData(doseHistory || [], doseSort), [doseHistory, doseSort]);
  const sortedSupplyHistory = useMemo(() => sortData(supplyHistory || [], supplySort), [supplyHistory, supplySort]);
  const filteredItems = (items || []).filter((item: any) => !itemSearch || item.nama_item.toLowerCase().includes(itemSearch.toLowerCase()));
  const totalCount = assignments?.length || 0;
  const activeCount = useMemo(() => (assignments || []).filter(a => a.aktif).length, [assignments]);

  if (patientLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid rgba(24, 119, 242, 0.15)", borderTopColor: "#1877f2", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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
    <div className="space-y-6 butiran-pesakit" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(24, 119, 242, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <div className="flex items-center justify-between">
        <Breadcrumb items={(() => { const source = getNavSource(); if (source?.startsWith("stok:")) { const rest = source.replace("stok:", ""); const lastColon = rest.lastIndexOf(":"); const itemName = lastColon >= 0 ? rest.substring(0, lastColon) : rest; const itemId = lastColon >= 0 ? rest.substring(lastColon + 1) : ""; return [{ label: "Inventori", href: "/stok" }, { label: itemName, href: itemId ? `/stok/${itemId}` : undefined }, { label: patient.nama }]; } return [{ label: "Pesakit", href: "/pesakit" }, { label: patient.nama }]; })()} />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px" }}>
        <button onClick={() => router.push("/pesakit")} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(24, 119, 242, 0.15)", background: "rgba(24, 119, 242, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0 }}>
          <ArrowLeft size={20} color="#1877f2" />
        </button>
        <h1 style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>Butiran Pesakit</h1>
      </motion.div>

      {/* 1. Patient Info Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <FoldableCard
          title={patient.nama}
          defaultOpen={true}
          headerExtra={
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()} style={{ flexWrap: "wrap" }}>
              <Badge variant={patient.aktif ? "success" : "destructive"}>{patient.aktif ? "Aktif" : "Tidak Aktif"}</Badge>
              {canEdit && <Button variant="outline" size="sm" onClick={() => setOpenMerge(true)}><Merge className="mr-2 h-4 w-4" /> Gabung</Button>}
              {canEdit && !editMode && <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditData(patient); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
              {canEdit && <Button variant={patient.aktif ? "destructive" : "default"} size="sm" onClick={() => setOpenDeactivate(true)}>{patient.aktif ? "Nyahaktif" : "Aktifkan"}</Button>}
            </div>
          }
        >
          {editMode ? (
            <div className="space-y-4">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
                <div className="space-y-2"><Label>Nama</Label><Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} onBlur={e => setEditData({ ...editData, nama: toTitleCase(e.target.value.trim()) })} /></div>
                <div className="space-y-2"><Label>No. KP</Label><Input value={editData.nombor_kad_pengenalan || ""} onChange={e => setEditData({ ...editData, nombor_kad_pengenalan: e.target.value })} onBlur={e => setEditData({ ...editData, nombor_kad_pengenalan: formatMyKad(e.target.value.trim()) })} /></div>
                <div className="space-y-2"><Label>No. Telefon</Label><Input value={editData.nombor_telefon || ""} onChange={e => setEditData({ ...editData, nombor_telefon: e.target.value })} onBlur={e => setEditData({ ...editData, nombor_telefon: formatPhone(e.target.value.trim()) })} /></div>
                <div className="space-y-2"><Label>No. Pendaftaran Hospital</Label><Input value={editData.nombor_pendaftaran_hospital || ""} onChange={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value })} onBlur={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value.trim().toUpperCase() })} /></div>
              </div>
              <div className="space-y-2"><Label>Alamat</Label><Textarea value={editData.alamat || ""} onChange={e => setEditData({ ...editData, alamat: e.target.value })} onBlur={e => setEditData({ ...editData, alamat: toTitleCase(e.target.value.trim()) })} /></div>
              <div className="space-y-2"><Label>Catatan</Label><Textarea value={editData.catatan || ""} onChange={e => setEditData({ ...editData, catatan: e.target.value })} onBlur={e => setEditData({ ...editData, catatan: e.target.value.trim() })} /></div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const trimmed = {
                    nama: (editData.nama || "").trim(),
                    nombor_kad_pengenalan: (editData.nombor_kad_pengenalan || "").trim(),
                    nombor_pendaftaran_hospital: (editData.nombor_pendaftaran_hospital || "").trim(),
                    nombor_telefon: (editData.nombor_telefon || "").trim(),
                    alamat: (editData.alamat || "").trim(),
                    catatan: (editData.catatan || "").trim(),
                  };
                  updatePatientMutation.mutate({
                    ...trimmed,
                    nama: toTitleCase(trimmed.nama),
                    nombor_kad_pengenalan: formatMyKad(trimmed.nombor_kad_pengenalan),
                    nombor_pendaftaran_hospital: trimmed.nombor_pendaftaran_hospital.toUpperCase(),
                    nombor_telefon: formatPhone(trimmed.nombor_telefon),
                    alamat: toTitleCase(trimmed.alamat),
                  });
                  setEditData(trimmed);
                }} disabled={updatePatientMutation.isPending}>
                  {updatePatientMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? "8px" : "16px", fontSize: "14px", marginBottom: "16px" }}>
                <div><span className="text-muted-foreground">No. KP:</span> {patient.nombor_kad_pengenalan || "-"}</div>
                <div><span className="text-muted-foreground">No. Pendaftaran Hospital:</span> {patient.nombor_pendaftaran_hospital || "-"}</div>
                <div><span className="text-muted-foreground">No. Telefon:</span> {patient.nombor_telefon || "-"}</div>
                <div><span className="text-muted-foreground">Tarikh Daftar:</span> {formatDate(patient.created_at)}</div>
                <div style={{ gridColumn: isMobile ? "1" : "span 2" }}><span className="text-muted-foreground">Alamat:</span> {patient.alamat || "-"}</div>
                {patient.catatan && <div style={{ gridColumn: isMobile ? "1" : "span 2" }}><span className="text-muted-foreground">Catatan:</span> {patient.catatan}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "8px" : "12px" }}>
                <div className="rounded-lg border p-3 flex items-center gap-3" style={{ padding: isMobile ? "10px" : "12px" }}>
                  <div className="flex items-center justify-center rounded-full bg-blue-100" style={{ width: isMobile ? "36px" : "40px", height: isMobile ? "36px" : "40px", flexShrink: 0 }}>
                    <Pill className="text-blue-600" style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                  </div>
                  <div style={{ minWidth: 0 }}><p className="text-xs text-muted-foreground">Jumlah Item</p><p style={{ fontSize: isMobile ? "14px" : "18px", fontWeight: 700 }}>{totalCount}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3" style={{ padding: isMobile ? "10px" : "12px" }}>
                  <div className="flex items-center justify-center rounded-full bg-emerald-100" style={{ width: isMobile ? "36px" : "40px", height: isMobile ? "36px" : "40px", flexShrink: 0 }}>
                    <Activity className="text-emerald-600" style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                  </div>
                  <div style={{ minWidth: 0 }}><p className="text-xs text-muted-foreground">Item Aktif</p><p style={{ fontSize: isMobile ? "14px" : "18px", fontWeight: 700 }}>{activeCount}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3" style={{ padding: isMobile ? "10px" : "12px" }}>
                  <div className="flex items-center justify-center rounded-full bg-purple-100" style={{ width: isMobile ? "36px" : "40px", height: isMobile ? "36px" : "40px", flexShrink: 0 }}>
                    <Users className="text-purple-600" style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                  </div>
                  <div style={{ minWidth: 0 }}><p className="text-xs text-muted-foreground">Status</p><p style={{ fontSize: isMobile ? "14px" : "18px", fontWeight: 700 }}>{patient.aktif ? "Aktif" : "Tidak"}</p></div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3" style={{ padding: isMobile ? "10px" : "12px" }}>
                  <div className="flex items-center justify-center rounded-full bg-amber-100" style={{ width: isMobile ? "36px" : "40px", height: isMobile ? "36px" : "40px", flexShrink: 0 }}>
                    <Calendar className="text-amber-600" style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                  </div>
                  <div style={{ minWidth: 0 }}><p className="text-xs text-muted-foreground">Daftar</p><p style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: 700 }}>{formatDate(patient.created_at)}</p></div>
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
            <DialogDescription className="text-sm">
              <span className="block mb-2">Anda akan menyahaktifkan pesakit ini dari sistem.</span>
              <span className="block p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong>Amaran:</strong> Pesakit yang dinyahaktifkan tidak akan dapat menerima bekalan baharu. Semua rekod item dan bekalan sedia ada akan kekal dalam sistem. Anda boleh mengaktifkan semula pesakit ini pada bila-bila masa.
              </span>
            </DialogDescription>
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
                      <Input type="search" value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="pl-8" />
                    </div>
                    <div className="max-h-[240px] overflow-auto rounded-lg border">
                      {(items || []).filter((i: any) => !itemSearch || i.nama_item.toLowerCase().includes(itemSearch.toLowerCase())).map((item: any) => {
                        const alreadyActive = activeItemIds.has(item.id);
                        return (
                        <div key={item.id} onClick={() => { if (!alreadyActive) setSelectedItemId(selectedItemId === item.id ? null : item.id); }} className="p-3 border-b last:border-b-0 cursor-pointer transition-colors" style={{ background: selectedItemId === item.id ? "rgba(24, 119, 242, 0.06)" : "transparent", opacity: alreadyActive ? 0.5 : 1 }}>
                          <div className="font-medium text-sm">{item.nama_item} {item.kekuatan}</div>
                          <div className="text-xs text-muted-foreground">{item.kod_item} | Baki: {item.baki_kuota ?? "-"}{alreadyActive ? " | Sedang Aktif" : ""}</div>
                        </div>
                      );})}
                    </div>
                    {selectedItemId && activeItemIds.has(selectedItemId) && (
                      <p className="text-xs text-destructive">Item ini sudah didaftarkan dan sedang aktif untuk pesakit ini. Tamatkan tugasan sedia ada sebelum menambah semula.</p>
                    )}
                    <div className="space-y-2"><Label>Dos</Label><Input value={newAssignment.dos} onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })} onBlur={e => setNewAssignment({ ...newAssignment, dos: e.target.value.trim().toUpperCase() })} /></div>
                    <div className="space-y-2"><Label>Catatan</Label><Input value={newAssignment.catatan_penggunaan} onChange={e => setNewAssignment({ ...newAssignment, catatan_penggunaan: e.target.value })} onBlur={e => setNewAssignment({ ...newAssignment, catatan_penggunaan: e.target.value.trim() })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenAddAssignment(false)}>Batal</Button>
                    <Button onClick={() => { if (selectedItemId) addAssignmentMutation.mutate({ ...newAssignment, dos: newAssignment.dos.trim().toUpperCase(), catatan_penggunaan: newAssignment.catatan_penggunaan.trim(), item_id: selectedItemId }); }} disabled={!selectedItemId || addAssignmentMutation.isPending || (selectedItemId ? activeItemIds.has(selectedItemId) : false)}>
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
                    <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: a.aktif ? "rgba(24, 119, 242, 0.1)" : "rgba(107, 114, 128, 0.1)", flexShrink: 0 }}>
                        <Pill className="h-4 w-4" style={{ color: a.aktif ? "#1877f2" : "#6b7280" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="font-medium text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getItemDisplayName(a.item)}</div>
                        <div className="text-xs text-muted-foreground">{a.dos || "Tiada dos"} &middot; {formatDate(a.tarikh_mula_guna)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
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
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "6px" : "12px", fontSize: "14px", marginBottom: "12px", padding: "12px", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                            <div><span className="text-muted-foreground text-xs">Dos:</span> <p className="font-medium">{a.dos || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Mula Guna:</span> <p className="font-medium">{formatDate(a.tarikh_mula_guna) || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Tamat Guna:</span> <p className="font-medium">{a.tarikh_tamat_guna ? formatDate(a.tarikh_tamat_guna) : "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Sebab Tamat:</span> <p className="font-medium">{a.sebab_tamat || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Dimulakan Oleh:</span> <p className="font-medium">{a.dimulakan?.nama || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Ditamatkan Oleh:</span> <p className="font-medium">{a.ditamatkan?.nama || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Direkod Oleh:</span> <p className="font-medium">{a.perekod?.nama || "-"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Tarikh Didaftar:</span> <p className="font-medium">{formatDate(a.created_at)}</p></div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                            {a.aktif && <Button size="sm" onClick={() => setOpenSupply(a.id)}><Package className="mr-1 h-3.5 w-3.5" /> Bekal</Button>}
                            {a.aktif && <Button size="sm" variant="outline" onClick={() => { setOpenUpdateDose(a.id); setDoseUpdate({ dos: a.dos || "", catatan: "" }); }}><Edit className="mr-1 h-3.5 w-3.5" /> Kemaskini Dos</Button>}
                            {canEdit && a.aktif && <Button size="sm" variant="destructive" onClick={() => { setOpenStopAssign(a.id); setStopReason(""); }}><XCircle className="mr-1 h-3.5 w-3.5" /> Tamatkan</Button>}
                          </div>

                          {/* Dose History */}
                          <FoldableCard title="Sejarah Dos" count={doseHistory?.length || 0} defaultOpen={false}>
                            {sortedDoseHistory.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                <Table>
                                <TableHeader>
                                  <TableRow>
                                    <SortableHeader label="Tarikh" sortKey="tarikh" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                    <SortableHeader label="Dos" sortKey="dos" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                    <SortableHeader label="Dikemaskini Oleh" sortKey="staff.nama" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                    <SortableHeader label="Catatan" sortKey="catatan" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortedDoseHistory.map((d: any) => (
                                    <TableRow key={d.id}>
                                      <TableCell className="text-xs">{formatDate(d.tarikh)}</TableCell>
                                      <TableCell className="text-xs">{d.dos}</TableCell>
                                      <TableCell className="text-xs">{d.staff?.nama || "-"}</TableCell>
                                      <TableCell className="text-xs">{d.catatan || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground py-2">Tiada sejarah dos.</p>
                            )}
                          </FoldableCard>

                          {/* Supply History */}
                          <div style={{ marginTop: "8px" }}>
                            <FoldableCard title="Sejarah Bekalan" count={supplyHistory?.length || 0} defaultOpen={false}>
                              {sortedSupplyHistory.length > 0 ? (
                                <div style={{ overflowX: "auto" }}>
                                <Table>
                                <TableHeader>
                                  <TableRow>
                                    <SortableHeader label="Tarikh" sortKey="tarikh_dibekal" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <SortableHeader label="Kuantiti" sortKey="kuantiti" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <SortableHeader label="Dos" sortKey="dos" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <SortableHeader label="Tempoh" sortKey="tempoh_dibekal" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <SortableHeader label="Kakitangan" sortKey="staff.nama" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <SortableHeader label="Catatan" sortKey="catatan_bekalan" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                    <TableHead>Tindakan</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortedSupplyHistory.map((r: any) => (
                                    <TableRow key={r.id}>
                                      <TableCell className="text-xs">{formatDate(r.tarikh_dibekal)}</TableCell>
                                      <TableCell className="text-xs">{r.kuantiti}</TableCell>
                                      <TableCell className="text-xs">{r.dos || "-"}</TableCell>
                                      <TableCell className="text-xs">{r.tempoh_dibekal || "-"}</TableCell>
                                      <TableCell className="text-xs">{r.staff?.nama || "-"}</TableCell>
                                      <TableCell className="text-xs">{r.catatan_bekalan || "-"}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => { const parts = (r.tempoh_dibekal || "").split(" "); setEditSupplyRecord({ ...r, editDos: r.dos, editKuantiti: r.kuantiti, editTempohNilai: parts[0] || "", editTempohUnit: parts[1] || "Hari", editCatatan: r.catatan_bekalan || "" }); }}><Edit className="h-3 w-3" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setOpenDeleteSupply(r)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                </div>
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
            <DialogDescription className="text-sm">
              <span className="block mb-2">Anda akan menamatkan item ini untuk pesakit.</span>
              <span className="block p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                <strong>Amaran:</strong> Item yang ditamatkan tidak akan dapat dibekalkan lagi kepada pesakit ini. Sejarah bekalan dan dos sedia ada akan kekal dalam sistem. Tindakan ini tidak boleh dibatalkan.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Sebab Tamat</Label>
            <Input value={stopReason} onChange={e => setStopReason(e.target.value)} onBlur={e => setStopReason(e.target.value.trim())} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStopAssign(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (openStopAssign && stopReason.trim()) stopAssignmentMutation.mutate({ assignmentId: openStopAssign, sebab: stopReason.trim() }); }} disabled={!stopReason?.trim() || stopAssignmentMutation.isPending}>
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
            <div className="space-y-2"><Label>Dos</Label><Input value={editSupplyRecord?.editDos ?? editSupplyRecord?.dos} readOnly className="opacity-60" /></div>
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={editSupplyRecord?.editKuantiti ?? editSupplyRecord?.kuantiti} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value })} onBlur={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value.trim() })} /></div>
            <div className="space-y-2"><Label>Tempoh Dibekal</Label>
              <div className="flex gap-2">
                <Input type="number" value={editSupplyRecord?.editTempohNilai ?? ""} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editTempohNilai: e.target.value })} onBlur={e => setEditSupplyRecord({ ...editSupplyRecord, editTempohNilai: e.target.value.trim() })} className="w-24" />
                <Select value={editSupplyRecord?.editTempohUnit ?? "Hari"} onValueChange={v => setEditSupplyRecord({ ...editSupplyRecord, editTempohUnit: v })}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(durations || []).map(d => (
                      <SelectItem key={d.nama} value={d.nama}>{d.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Catatan Bekalan</Label><Input value={editSupplyRecord?.editCatatan ?? ""} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editCatatan: e.target.value })} onBlur={e => setEditSupplyRecord({ ...editSupplyRecord, editCatatan: e.target.value.trim() })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplyRecord(null)}>Batal</Button>
            <Button onClick={() => { if (editSupplyRecord) saveEditSupplyMutation.mutate({ supplyId: editSupplyRecord.id, updates: { dos: editSupplyRecord.editDos ?? editSupplyRecord.dos, tempoh_dibekal: `${(editSupplyRecord.editTempohNilai ?? "").trim()} ${editSupplyRecord.editTempohUnit ?? "Hari"}`, kuantiti: (editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti).toString().trim(), catatan_bekalan: (editSupplyRecord.editCatatan || "").trim() } }); }} disabled={saveEditSupplyMutation.isPending}>
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
            <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Dos Baru</Label><Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} onBlur={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value.trim().toUpperCase() })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Input value={doseUpdate.catatan} onChange={e => setDoseUpdate({ ...doseUpdate, catatan: e.target.value })} onBlur={e => setDoseUpdate({ ...doseUpdate, catatan: e.target.value.trim() })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdateDose(null)}>Batal</Button>
            <Button onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos.trim().toUpperCase() }); }} disabled={updateDoseMutation.isPending}>
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
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} onBlur={e => setSupplyData({ ...supplyData, kuantiti: e.target.value.trim() })} /></div>
            <div className="space-y-2"><Label>Tempoh Dibekal</Label>
              <div className="flex gap-2">
                <Input type="number" value={supplyData.tempoh_nilai} onChange={e => setSupplyData({ ...supplyData, tempoh_nilai: e.target.value })} className="w-24" />
                <Select value={supplyData.tempoh_unit} onValueChange={v => setSupplyData({ ...supplyData, tempoh_unit: v })}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(durations || []).map(d => (
                      <SelectItem key={d.nama} value={d.nama}>{d.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Pilih Kelompok (FEFO)</Label>
              <div className="max-h-[160px] overflow-auto rounded-lg border">
                {(!availableBatches || availableBatches.length === 0) ? (
                  <p className="text-xs text-muted-foreground p-3">Tiada kelompok tersedia.</p>
                ) : availableBatches.map((b: ItemBatch) => (
                  <div key={b.id} onClick={() => setSupplyData(prev => ({ ...prev, batch_id: b.id }))}
                    className="p-2.5 border-b last:border-b-0 cursor-pointer transition-colors flex items-center gap-3"
                    style={{ background: supplyData.batch_id === b.id ? "rgba(24, 119, 242, 0.06)" : "transparent" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid", borderColor: supplyData.batch_id === b.id ? "#1877f2" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {supplyData.batch_id === b.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1877f2" }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="text-xs font-medium">{b.nombor_kelompok}</div>
                      <div className="text-[11px] text-muted-foreground">Luput: {formatDate(b.tarikh_luput)} | Stok: {b.kuantiti}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>Catatan Bekalan</Label><Input value={supplyData.catatan_bekalan} onChange={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value })} onBlur={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value.trim() })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSupply(null)}>Batal</Button>
            <Button onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, kuantiti: supplyData.kuantiti.trim(), catatan_bekalan: supplyData.catatan_bekalan.trim(), assignment_id: openSupply, dos: currentAssignment.dos || "" }); }} disabled={!supplyData.batch_id || !supplyData.kuantiti.trim() || supplyMutation.isPending}>
              {supplyMutation.isPending ? "Membekal..." : "Bekal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}

      <style>{`
        @media (max-width: 768px) {
          main {
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-bottom: 100px !important;
          }
          [role="dialog"] {
            max-width: calc(100vw - 32px) !important;
            max-height: calc(100dvh - 80px) !important;
            overflow-y: auto !important;
            margin: 16px !important;
          }
          [role="dialog"] > div {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          .butiran-pesakit .space-y-6 > * + * {
            margin-top: 12px !important;
          }
        }
        @media (min-width: 769px) {
          main {
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  );
}