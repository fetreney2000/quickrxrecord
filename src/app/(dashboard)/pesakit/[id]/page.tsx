"use client";

import React, { useState, useRef } from "react";
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
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, XCircle, Package, Merge, Trash2, ChevronDown, ChevronUp, ClipboardList, Activity, Search } from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, ItemBatch } from "@/types";

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
  const [foldDose, setFoldDose] = useState(true);
  const [foldSupply, setFoldSupply] = useState(true);
  const [openStopAssign, setOpenStopAssign] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [openDeleteSupply, setOpenDeleteSupply] = useState<any>(null);
  const itemSearchRef = useRef<HTMLInputElement>(null);

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Patient;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patient_item_assignments").select("*, item:items(*)").eq("patient_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as (PatientItemAssignment & { item: Item })[];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["items-with-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, kuota, catatan").eq("aktif", true).order("nama_item");
      if (error) throw error;
      const itemsList = data as any[];
      const { data: counts } = await supabase.from("patient_item_assignments").select("item_id").eq("aktif", true);
      const itemCountMap: Record<string, number> = {};
      for (const c of (counts || [])) itemCountMap[c.item_id] = (itemCountMap[c.item_id] || 0) + 1;
      return itemsList.map(item => ({ ...item, patient_count: itemCountMap[item.id] || 0, baki_kuota: item.kuota != null ? Math.max(0, item.kuota - (itemCountMap[item.id] || 0)) : null }));
    },
  });

  const { data: doseHistory } = useQuery({
    queryKey: ["dose-history", expandedAssignment],
    queryFn: async () => {
      if (!expandedAssignment) return [];
      const { data: doseData, error } = await supabase.from("dose_history").select("*").eq("assignment_id", expandedAssignment).order("tarikh", { ascending: false });
      if (!error && doseData) {
        const staffIds = [...new Set(doseData.map(d => d.dikemaskini_oleh).filter(Boolean))];
        let staffMap: Record<string, any> = {};
        if (staffIds.length > 0) { const { data: staff } = await supabase.from("profiles").select("id, nama").in("id", staffIds); for (const s of (staff || [])) staffMap[s.id] = s; }
        return doseData.map(d => ({ ...d, staff_name: d.dikemaskini_oleh ? (staffMap[d.dikemaskini_oleh]?.nama || "-") : "-" }));
      }
      return doseData || [];
    },
    enabled: !!expandedAssignment,
  });

  const { data: supplyHistory } = useQuery({
    queryKey: ["supply-history", expandedAssignment],
    queryFn: async () => {
      if (!expandedAssignment) return [];
      const { data, error } = await supabase.from("supply_records").select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)").eq("assignment_id", expandedAssignment).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!expandedAssignment,
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (updates: Partial<Patient>) => { const { error } = await supabase.from("patients").update(updates).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Maklumat pesakit dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); },
    onError: () => toast.error("Gagal mengemaskini pesakit."),
  });

  const addAssignmentMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      const { error } = await supabase.from("patient_item_assignments").insert({ patient_id: id, item_id: data.item_id, dos: data.dos || null, tarikh_mula_guna: data.tarikh_mula_guna, dimulakan_oleh: profile?.id, kakitangan_farmasi_perekod: profile?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item berjaya ditambah."); setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); setNewAssignment({ item_id: "", dos: "", tarikh_mula_guna: new Date().toISOString().split("T")[0] }); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["items-with-stats"] }); },
    onError: () => toast.error("Gagal menambah item."),
  });

  const stopAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, sebab }: { assignmentId: string; sebab: string }) => {
      const { error } = await supabase.from("patient_item_assignments").update({ tarikh_tamat_guna: new Date().toISOString().split("T")[0], ditamatkan_oleh: profile?.id, sebab_tamat: sebab, aktif: false }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item ditamatkan."); setOpenStopAssign(null); setStopReason(""); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["items-with-stats"] }); },
    onError: () => toast.error("Gagal menamatkan item."),
  });

  const updateDoseMutation = useMutation({
    mutationFn: async ({ assignmentId, dos, catatan }: { assignmentId: string; dos: string; catatan?: string }) => {
      const { error: updateError } = await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId);
      if (updateError) throw updateError;
      const { error: historyError } = await supabase.from("dose_history").insert({ assignment_id: assignmentId, tarikh: new Date().toISOString().split("T")[0], dos, aktif: true, catatan: catatan || null, dikemaskini_oleh: profile?.id });
      if (historyError) throw historyError;
    },
    onSuccess: () => { toast.success("Dos dikemaskini."); setOpenUpdateDose(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["dose-history", expandedAssignment] }); },
    onError: () => toast.error("Gagal mengemaskini dos."),
  });

  const { data: availableBatches } = useQuery({
    queryKey: ["batches-for-supply", openSupply],
    queryFn: async () => {
      if (!openSupply) return [];
      const assignment = assignments?.find(a => a.id === openSupply);
      if (!assignment) return [];
      const { data, error } = await supabase.from("item_batches").select("*").eq("item_id", assignment.item_id).gt("kuantiti", 0).gte("tarikh_luput", new Date().toISOString().split("T")[0]).order("tarikh_luput", { ascending: true });
      if (error) throw error;
      return data as ItemBatch[];
    },
    enabled: !!openSupply,
  });

  const supplyMutation = useMutation({
    mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => {
      const parsedKuantiti = parseInt(data.kuantiti, 10);
      // Client-side validation before API call
      if (!data.kuantiti || isNaN(parsedKuantiti) || parsedKuantiti <= 0) {
        throw new Error("Kuantiti mesti lebih daripada 0.");
      }
      if (data.batch_id) {
        const batch = availableBatches?.find(b => b.id === data.batch_id);
        if (!batch) throw new Error("Kelompok tidak dijumpai.");
        if (batch.kuantiti < parsedKuantiti) throw new Error(`Stok tidak mencukupi. Stok semasa: ${batch.kuantiti}, diperlukan: ${parsedKuantiti}`);
      }
      const tempoh = `${data.tempoh_nilai} ${data.tempoh_unit}`;
      const res = await fetch("/api/supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: data.assignment_id,
          dos: data.dos,
          tempoh_dibekal: tempoh,
          kuantiti: data.kuantiti,
          batch_id: data.batch_id || null, // null = auto FEFO
          kakitangan_pembekal: profile?.id,
          catatan_bekalan: data.catatan_bekalan || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal merekod bekalan.");
      return result;
    },
    onSuccess: () => { toast.success("Bekalan berjaya direkodkan."); setOpenSupply(null); setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" }); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); },
    onError: (e: any) => toast.error(e.message || "Gagal merekod bekalan."),
  });

  const deleteSupplyMutation = useMutation({
    mutationFn: async (supplyId: string) => { const { error } = await supabase.from("supply_records").delete().eq("id", supplyId); if (error) throw error; },
    onSuccess: () => { toast.success("Rekod bekalan dipadam."); setOpenDeleteSupply(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); },
    onError: () => toast.error("Gagal memadam rekod bekalan."),
  });

  const saveEditSupplyMutation = useMutation({
    mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: any }) => {
      const { error } = await supabase.from("supply_records").update({ dos: updates.dos, tempoh_dibekal: updates.tempoh_dibekal, kuantiti: parseInt(updates.kuantiti), catatan_bekalan: updates.catatan_bekalan || null }).eq("id", supplyId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rekod bekalan dikemaskini."); setEditSupplyRecord(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); },
    onError: () => toast.error("Gagal mengemaskini rekod bekalan."),
  });

  if (!patient) return <div className="flex items-center justify-center py-12">Memuatkan...</div>;

  const currentAssignment = openSupply ? assignments?.find(a => a.id === openSupply) : null;

  const toggleExpand = (assignmentId: string) => {
    if (expandedAssignment !== assignmentId) { setFoldDose(true); setFoldSupply(true); }
    setExpandedAssignment(expandedAssignment === assignmentId ? null : assignmentId);
    setEditSupplyRecord(null);
  };

  const filteredItems = (items || []).filter((item: any) => !itemSearch || item.nama_item.toLowerCase().includes(itemSearch.toLowerCase()) || item.kod_item?.toLowerCase().includes(itemSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Pesakit", href: "/pesakit" }, { label: patient.nama || "Butiran Pesakit" }]} />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pesakit")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">Butiran Pesakit</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{patient.nama}</CardTitle>
          <div className="flex gap-2">
            {canEdit && <Button variant="outline" size="sm" onClick={() => setOpenMerge(true)}><Merge className="mr-2 h-4 w-4" /> Gabung</Button>}
            {canEdit && !editMode && <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditData(patient); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama</Label><Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. KP</Label><Input value={editData.nombor_kad_pengenalan || ""} onChange={e => setEditData({ ...editData, nombor_kad_pengenalan: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. Hospital</Label><Input value={editData.nombor_pendaftaran_hospital || ""} onChange={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. Telefon</Label><Input value={editData.nombor_telefon || ""} onChange={e => setEditData({ ...editData, nombor_telefon: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Alamat</Label><Textarea value={editData.alamat || ""} onChange={e => setEditData({ ...editData, alamat: e.target.value })} /></div>
              <div className="space-y-2"><Label>Catatan</Label><Textarea value={editData.catatan || ""} onChange={e => setEditData({ ...editData, catatan: e.target.value })} /></div>
              <div className="flex gap-2"><Button onClick={() => updatePatientMutation.mutate(editData)}>Simpan</Button><Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">No. KP:</span> {patient.nombor_kad_pengenalan || "-"}</div>
              <div><span className="text-muted-foreground">No. Hospital:</span> {patient.nombor_pendaftaran_hospital || "-"}</div>
              <div><span className="text-muted-foreground">No. Telefon:</span> {patient.nombor_telefon || "-"}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> {patient.alamat || "-"}</div>
              <div><span className="text-muted-foreground">Tarikh Daftar:</span> {formatDate(patient.created_at)}</div>
              {patient.catatan && <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> {patient.catatan}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Item Didaftarkan</CardTitle>
          {canEdit && (
            <Dialog open={openAddAssignment} onOpenChange={(v) => { setOpenAddAssignment(v); if (!v) { setSelectedItemId(null); setItemSearch(""); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Item</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Tambah Item Baharu</DialogTitle><DialogDescription>Cari dan pilih item dari senarai di bawah.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Cari Item Ubat</Label>
                    <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input ref={itemSearchRef} className="pl-8" value={itemSearch} onChange={e => setItemSearch(e.target.value)} /></div>
                  </div>
                  <div className="border rounded-md max-h-52 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background"><TableRow><TableHead className="w-[40px]"></TableHead><TableHead>Item</TableHead><TableHead>Kuota</TableHead><TableHead>Guna</TableHead><TableHead>Baki</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredItems.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Tiada item dijumpai.</TableCell></TableRow> : (
                          filteredItems.map((item: any) => (
                            <TableRow key={item.id} className={`cursor-pointer ${selectedItemId === item.id ? "bg-primary/10" : ""}`} onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}>
                              <TableCell><input type="radio" name="item_select" checked={selectedItemId === item.id} onChange={() => setSelectedItemId(item.id)} className="accent-primary" /></TableCell>
                              <TableCell><div className="font-medium text-sm">{item.nama_item} {item.kekuatan}</div><div className="text-xs text-muted-foreground">{item.kod_item}</div></TableCell>
                              <TableCell className="text-sm">{item.kuota ?? "-"}</TableCell>
                              <TableCell className="text-sm">{item.patient_count}</TableCell>
                              <TableCell className="text-sm">{item.baki_kuota != null ? <Badge variant={item.baki_kuota > 0 ? "success" : "destructive"}>{item.baki_kuota}</Badge> : "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedItemId && <div className="p-3 bg-accent/30 rounded-md"><p className="text-sm font-medium">Dipilih: {items?.find((i: any) => i.id === selectedItemId)?.nama_item}</p></div>}
                  <div className="space-y-2"><Label>Dos</Label><Input value={newAssignment.dos} onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Tarikh Mula</Label><Input type="date" value={newAssignment.tarikh_mula_guna} onChange={e => setNewAssignment({ ...newAssignment, tarikh_mula_guna: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); }}>Batal</Button>
                  <Button onClick={() => { if (selectedItemId) addAssignmentMutation.mutate({ ...newAssignment, item_id: selectedItemId }); }} disabled={!selectedItemId || !newAssignment.dos || addAssignmentMutation.isPending}>{addAssignmentMutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {assignments?.length === 0 ? <div className="p-6 text-center text-muted-foreground">Tiada item didaftarkan.</div> : (
              assignments?.map(assignment => (
                <div key={assignment.id}>
                  <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors text-left" onClick={() => toggleExpand(assignment.id)}>
                    <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                      <div><div className="font-medium">{assignment.item?.nama_item}</div><div className="text-xs text-muted-foreground">{assignment.item?.kekuatan}</div></div>
                      <div className="text-sm">{assignment.dos || "-"}</div>
                      <div className="text-sm">{formatDate(assignment.tarikh_mula_guna)}</div>
                      <div><Badge variant={assignment.aktif ? "success" : "secondary"}>{assignment.aktif ? "Aktif" : "Tamat"}</Badge></div>
                    </div>
                    <div className="ml-4">{expandedAssignment === assignment.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                  </button>

                  <AnimatePresence>
                    {expandedAssignment === assignment.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-6 pb-6 pt-2 bg-accent/10 border-t border-border/50 space-y-4">
                          <div className="flex gap-2 flex-wrap">
                            {assignment.aktif && <>
                              <Button size="sm" variant="outline" onClick={() => { setOpenUpdateDose(assignment.id); setDoseUpdate({ dos: assignment.dos || "", catatan: "" }); }}><Edit className="mr-1.5 h-3.5 w-3.5" /> Kemaskini Dos</Button>
                              {canSupply && <Button size="sm" onClick={() => { setOpenSupply(assignment.id); setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" }); }}><Package className="mr-1.5 h-3.5 w-3.5" /> Bekal Item</Button>}
                              {canEdit && <Button size="sm" variant="destructive" onClick={() => { setOpenStopAssign(assignment.id); setStopReason(""); }}><XCircle className="mr-1.5 h-3.5 w-3.5" /> Tamatkan</Button>}
                            </>}
                          </div>

                          <div>
                            <button className="text-sm font-semibold flex items-center gap-2 mb-3 w-full text-left hover:text-primary transition-colors" onClick={() => setFoldDose(!foldDose)}>
                              {foldDose ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronUp className="h-4 w-4 text-primary" />}
                              <Activity className="h-4 w-4 text-primary" /> Sejarah Dos <span className="text-xs text-muted-foreground font-normal">({doseHistory?.length || 0})</span>
                            </button>
                            {!foldDose && (doseHistory && doseHistory.length > 0 ? (
                              <div className="border rounded-md overflow-hidden">
                                <Table><TableHeader><TableRow><TableHead>Tarikh</TableHead><TableHead>Dos</TableHead><TableHead>Dikemaskini Oleh</TableHead></TableRow></TableHeader>
                                  <TableBody>{doseHistory.map((d: any) => (<TableRow key={d.id}><TableCell>{formatDate(d.tarikh)}</TableCell><TableCell className="font-medium">{d.dos}</TableCell><TableCell>{d.staff_name || "-"}</TableCell></TableRow>))}</TableBody>
                                </Table>
                              </div>
                            ) : <p className="text-sm text-muted-foreground">Tiada sejarah dos.</p>)}
                          </div>

                          <div>
                            <button className="text-sm font-semibold flex items-center gap-2 mb-3 w-full text-left hover:text-primary transition-colors" onClick={() => setFoldSupply(!foldSupply)}>
                              {foldSupply ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronUp className="h-4 w-4 text-primary" />}
                              <ClipboardList className="h-4 w-4 text-primary" /> Sejarah Bekalan <span className="text-xs text-muted-foreground font-normal">({supplyHistory?.length || 0})</span>
                            </button>
                            {!foldSupply && (supplyHistory && supplyHistory.length > 0 ? (
                              <div className="border rounded-md overflow-hidden">
                                <Table><TableHeader><TableRow><TableHead>Tarikh</TableHead><TableHead>Dos</TableHead><TableHead>Tempoh</TableHead><TableHead>Kuantiti</TableHead><TableHead>Kelompok</TableHead><TableHead>Kakitangan</TableHead><TableHead className="w-[100px]">Tindakan</TableHead></TableRow></TableHeader>
                                  <TableBody>{supplyHistory.map((record: any) => (<TableRow key={record.id}><TableCell>{formatDate(record.tarikh_dibekal)}</TableCell><TableCell>{record.dos}</TableCell><TableCell>{record.tempoh_dibekal || "-"}</TableCell><TableCell>{record.kuantiti}</TableCell><TableCell>{record.batch?.nombor_kelompok || "-"}</TableCell><TableCell>{record.staff?.nama || "-"}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditSupplyRecord(record)}><Edit className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => setOpenDeleteSupply(record)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell></TableRow>))}</TableBody>
                                </Table>
                              </div>
                            ) : <p className="text-sm text-muted-foreground">Tiada sejarah bekalan.</p>)}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stop Assignment Dialog */}
      <Dialog open={!!openStopAssign} onOpenChange={() => setOpenStopAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> Tamatkan Item</DialogTitle>
            <DialogDescription>Tindakan ini akan menamatkan item ini untuk pesakit ini. Sejarah dos dan bekalan akan tetap disimpan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm">
              <p className="font-medium text-destructive mb-1">⚠️ Amaran Penting</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                <li>Item ini akan ditamatkan serta-merta</li>
                <li>Tiada bekalan lanjut boleh dilakukan</li>
                <li>Catatan tarikh tamat dan siapa yang menamatkan akan direkodkan</li>
                <li>Sejarah dos dan bekalan sebelum ini tidak akan dipadam</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Sebab Tamat *</Label>
              <Select value={stopReason} onValueChange={setStopReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tukar kepada item lain">Tukar kepada item lain</SelectItem>
                  <SelectItem value="Pesakit tamat rawatan">Pesakit tamat rawatan</SelectItem>
                  <SelectItem value="Pesakit tidak datang (Defaulter)">Pesakit tidak datang (Defaulter)</SelectItem>
                  <SelectItem value="Reaksi buruk / alahan">Reaksi buruk / alahan</SelectItem>
                  <SelectItem value="Atas nasihat doktor">Atas nasihat doktor</SelectItem>
                  <SelectItem value="Pesakit meninggal dunia">Pesakit meninggal dunia</SelectItem>
                  <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStopAssign(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (openStopAssign && stopReason) stopAssignmentMutation.mutate({ assignmentId: openStopAssign, sebab: stopReason }); }} disabled={!stopReason || stopAssignmentMutation.isPending}>
              {stopAssignmentMutation.isPending ? "Menamatkan..." : "Ya, Tamatkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Supply Dialog */}
      <Dialog open={!!openDeleteSupply} onOpenChange={() => setOpenDeleteSupply(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Padam Rekod Bekalan</DialogTitle>
            <DialogDescription>Tindakan ini akan memadamkan rekod bekalan secara kekal dan tidak boleh dibatalkan.</DialogDescription>
          </DialogHeader>
          {openDeleteSupply && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm space-y-2">
                <p className="font-medium text-destructive">⚠️ Amaran Penting</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>Rekod bekalan ini akan dipadamkan secara kekal</li>
                  <li>Data tidak boleh dipulihkan semula</li>
                  <li>Kuantiti stok tidak akan dikembalikan secara automatik</li>
                  <li>Sejarah dos dan penugasan pesakit tidak terjejas</li>
                </ul>
              </div>
              <div className="rounded-md border text-sm">
                <div className="grid grid-cols-2 gap-3 p-3">
                  <div><span className="text-muted-foreground">Tarikh:</span> {formatDate(openDeleteSupply.tarikh_dibekal)}</div>
                  <div><span className="text-muted-foreground">Dos:</span> {openDeleteSupply.dos}</div>
                  <div><span className="text-muted-foreground">Kuantiti:</span> {openDeleteSupply.kuantiti}</div>
                  <div><span className="text-muted-foreground">Tempoh:</span> {openDeleteSupply.tempoh_dibekal || "-"}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteSupply(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (openDeleteSupply) { deleteSupplyMutation.mutate(openDeleteSupply.id); } }} disabled={deleteSupplyMutation.isPending}>
              {deleteSupplyMutation.isPending ? "Memadam..." : "Ya, Padamkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplyRecord} onOpenChange={() => setEditSupplyRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Rekod Bekalan</DialogTitle></DialogHeader>
          {editSupplyRecord && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Dos</Label><Input value={editSupplyRecord.editDos ?? editSupplyRecord.dos} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editDos: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tempoh Bekalan</Label><Input value={editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editTempoh: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value })} /></div>
              <div className="space-y-2"><Label>Catatan</Label><Textarea value={(editSupplyRecord.editCatatan ?? editSupplyRecord.catatan_bekalan) || ""} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editCatatan: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditSupplyRecord(null)}>Batal</Button>
            <Button onClick={() => { if (editSupplyRecord) saveEditSupplyMutation.mutate({ supplyId: editSupplyRecord.id, updates: { dos: editSupplyRecord.editDos ?? editSupplyRecord.dos, tempoh_dibekal: editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal, kuantiti: editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti, catatan_bekalan: editSupplyRecord.editCatatan ?? editSupplyRecord.catatan_bekalan } }); }} disabled={saveEditSupplyMutation.isPending}>{saveEditSupplyMutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openUpdateDose} onOpenChange={() => setOpenUpdateDose(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kemaskini Dos</DialogTitle><DialogDescription>Kemaskini dos untuk penugasan ini.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Dos Baru</Label><Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={doseUpdate.catatan} onChange={e => setDoseUpdate({ ...doseUpdate, catatan: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenUpdateDose(null)}>Batal</Button><Button onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos, catatan: doseUpdate.catatan }); }} disabled={!doseUpdate.dos || updateDoseMutation.isPending}>{updateDoseMutation.isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bekal Ubat</DialogTitle><DialogDescription>Rekodkan bekalan ubat untuk pesakit ini.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Dos Semasa</Label><Input value={currentAssignment?.dos || "-"} readOnly className="bg-muted" /><p className="text-xs text-muted-foreground">Guna <strong>Kemaskini Dos</strong> untuk menukar dos.</p></div>
            <div className="space-y-2"><Label>Kelompok (Batch)</Label>
              {!supplyData.batch_id && <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚡ Auto FEFO: kelompok terdekat luput akan dipilih automatik</p>}
              <Select value={supplyData.batch_id} onValueChange={v => setSupplyData({ ...supplyData, batch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{availableBatches?.map(batch => (<SelectItem key={batch.id} value={batch.id}>{batch.nombor_kelompok} - Stok: {batch.kuantiti} - Luput: {formatDate(batch.tarikh_luput)}</SelectItem>))}{availableBatches?.length === 0 && <SelectItem value="none" disabled>Tiada kelompok tersedia</SelectItem>}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tempoh Bekalan</Label><div className="flex gap-2"><Input type="number" className="w-24" value={supplyData.tempoh_nilai} onChange={e => setSupplyData({ ...supplyData, tempoh_nilai: e.target.value })} /><Select value={supplyData.tempoh_unit} onValueChange={v => setSupplyData({ ...supplyData, tempoh_unit: v })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hari">Hari</SelectItem><SelectItem value="Minggu">Minggu</SelectItem><SelectItem value="Bulan">Bulan</SelectItem></SelectContent></Select><span className="flex items-center text-sm text-muted-foreground">{supplyData.tempoh_nilai && `${supplyData.tempoh_nilai} ${supplyData.tempoh_unit}`}</span></div></div>
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={supplyData.catatan_bekalan} onChange={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenSupply(null)}>Batal</Button><Button onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply, dos: currentAssignment.dos || "" }); }} disabled={!supplyData.kuantiti || supplyMutation.isPending}>{supplyMutation.isPending ? "Menyimpan..." : "Bekal"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}
    </div>
  );
}