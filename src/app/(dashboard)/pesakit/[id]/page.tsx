"use client";

import React, { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Pill, Edit, XCircle, Package, Merge, History, Save, X, Trash2, ChevronDown, ChevronUp, ClipboardList, Activity } from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, SupplyRecord, ItemBatch, Profile } from "@/types";

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
  const [openSupply, setOpenSupply] = useState<string | null>(null);
  const [supplyData, setSupplyData] = useState({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" });
  const [openMerge, setOpenMerge] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [editSupplyId, setEditSupplyId] = useState<string | null>(null);
  const [editSupplyData, setEditSupplyData] = useState({ dos: "", tempoh_dibekal: "", kuantiti: "", catatan_bekalan: "" });
  const [openUpdateDose, setOpenUpdateDose] = useState<string | null>(null);
  const [doseUpdate, setDoseUpdate] = useState({ dos: "", catatan: "" });

  // Fetch patient
  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Patient;
    },
  });

  // Fetch assignments with items
  const { data: assignments } = useQuery({
    queryKey: ["assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_item_assignments")
        .select("*, item:items(*)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (PatientItemAssignment & { item: Item })[];
    },
  });

  // Fetch items for dropdown
  const { data: items } = useQuery({
    queryKey: ["items-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, nama_item, kekuatan, kod_item").eq("aktif", true).order("nama_item");
      if (error) throw error;
      return data as Pick<Item, "id" | "nama_item" | "kekuatan" | "kod_item">[];
    },
  });

  // Fetch dose history for expanded assignment
  const { data: doseHistory } = useQuery({
    queryKey: ["dose-history", expandedAssignment],
    queryFn: async () => {
      if (!expandedAssignment) return [];
      const { data: doseData, error } = await supabase
        .from("dose_history")
        .select("*")
        .eq("assignment_id", expandedAssignment)
        .order("tarikh", { ascending: false });
      if (!error && doseData) {
        const staffIds = [...new Set(doseData.map(d => d.dikemaskini_oleh).filter(Boolean))];
        let staffMap: Record<string, any> = {};
        if (staffIds.length > 0) {
          const { data: staff } = await supabase.from("profiles").select("id, nama").in("id", staffIds);
          for (const s of (staff || [])) staffMap[s.id] = s;
        }
        return doseData.map(d => ({ ...d, dikemaskini_oleh: d.dikemaskini_oleh ? staffMap[d.dikemaskini_oleh] || { nama: "-" } : null }));
      }
      return doseData || [];
    },
    enabled: !!expandedAssignment,
  });

  // Fetch supply history for expanded assignment
  const { data: supplyHistory } = useQuery({
    queryKey: ["supply-history", expandedAssignment],
    queryFn: async () => {
      if (!expandedAssignment) return [];
      const { data, error } = await supabase
        .from("supply_records")
        .select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)")
        .eq("assignment_id", expandedAssignment)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!expandedAssignment,
  });

  // Update patient
  const updatePatientMutation = useMutation({
    mutationFn: async (updates: Partial<Patient>) => {
      const { error } = await supabase.from("patients").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maklumat pesakit dikemaskini.");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
    },
    onError: () => toast.error("Gagal mengemaskini pesakit."),
  });

  // Add assignment
  const addAssignmentMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      const { error } = await supabase.from("patient_item_assignments").insert({
        patient_id: id,
        item_id: data.item_id,
        dos: data.dos || null,
        tarikh_mula_guna: data.tarikh_mula_guna,
        dimulakan_oleh: profile?.id,
        kakitangan_farmasi_perekod: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penugasan berjaya ditambah.");
      setOpenAddAssignment(false);
      setNewAssignment({ item_id: "", dos: "", tarikh_mula_guna: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
    },
    onError: () => toast.error("Gagal menambah penugasan."),
  });

  // Stop assignment
  const stopAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("patient_item_assignments").update({
        tarikh_tamat_guna: new Date().toISOString().split("T")[0],
        ditamatkan_oleh: profile?.id,
        aktif: false,
      }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penugasan ditamatkan.");
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
    },
    onError: () => toast.error("Gagal menamatkan penugasan."),
  });

  // Update dose
  const updateDoseMutation = useMutation({
    mutationFn: async ({ assignmentId, dos, catatan }: { assignmentId: string; dos: string; catatan?: string }) => {
      const { error: updateError } = await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId);
      if (updateError) throw updateError;
      const { error: historyError } = await supabase.from("dose_history").insert({
        assignment_id: assignmentId, tarikh: new Date().toISOString().split("T")[0], dos, aktif: true,
        catatan: catatan || null, dikemaskini_oleh: profile?.id,
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      toast.success("Dos dikemaskini.");
      setOpenUpdateDose(null);
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
      queryClient.invalidateQueries({ queryKey: ["dose-history", expandedAssignment] });
    },
    onError: () => toast.error("Gagal mengemaskini dos."),
  });

  // Fetch batches for supply
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

  // Supply mutation
  const supplyMutation = useMutation({
    mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => {
      const tempoh = `${data.tempoh_nilai} ${data.tempoh_unit}`;
      const { error: insertError } = await supabase.from("supply_records").insert({
        assignment_id: data.assignment_id, dos: data.dos, tempoh_dibekal: tempoh,
        kuantiti: parseInt(data.kuantiti), batch_id: data.batch_id || null,
        kakitangan_pembekal: profile?.id || "", catatan_bekalan: data.catatan_bekalan || null,
      });
      if (insertError) throw insertError;
      if (data.batch_id) {
        const batch = availableBatches?.find(b => b.id === data.batch_id);
        if (batch) {
          const { error: updateError } = await supabase.from("item_batches").update({ kuantiti: batch.kuantiti - parseInt(data.kuantiti) }).eq("id", data.batch_id);
          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Bekalan berjaya direkodkan.");
      setOpenSupply(null);
      setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" });
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
      queryClient.invalidateQueries({ queryKey: ["batches-for-supply"] });
    },
    onError: () => toast.error("Gagal merekod bekalan."),
  });

  // Delete supply mutation
  const deleteSupplyMutation = useMutation({
    mutationFn: async (supplyId: string) => {
      const { error } = await supabase.from("supply_records").delete().eq("id", supplyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rekod bekalan dipadam.");
      queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] });
    },
    onError: () => toast.error("Gagal memadam rekod bekalan."),
  });

  // Edit supply mutation
  const editSupplyMutation = useMutation({
    mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: typeof editSupplyData }) => {
      const { error } = await supabase.from("supply_records").update({ dos: updates.dos, tempoh_dibekal: updates.tempoh_dibekal, kuantiti: parseInt(updates.kuantiti), catatan_bekalan: updates.catatan_bekalan || null }).eq("id", supplyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rekod bekalan dikemaskini.");
      setEditSupplyId(null);
      queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] });
    },
    onError: () => toast.error("Gagal mengemaskini rekod bekalan."),
  });

  if (!patient) {
    return <div className="flex items-center justify-center py-12">Memuatkan...</div>;
  }

  const currentAssignment = openSupply ? assignments?.find(a => a.id === openSupply) : null;

  const toggleExpand = (assignmentId: string) => {
    setExpandedAssignment(expandedAssignment === assignmentId ? null : assignmentId);
    setEditSupplyId(null);
  };

  const ExpAssignment = assignments?.find(a => a.id === expandedAssignment);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[
          { label: "Papan Pemuka", href: "/" },
          { label: "Pesakit", href: "/pesakit" },
          { label: patient.nama || "Butiran Pesakit" },
        ]} />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pesakit")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Butiran Pesakit</h1>
      </div>

      {/* Patient Info Card */}
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
              <div className="flex gap-2"><Button onClick={() => updatePatientMutation.mutate(editData)} disabled={updatePatientMutation.isPending}>Simpan</Button><Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button></div>
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

      {/* Assignments with Expandable Rows */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Penugasan Item</CardTitle>
          {canEdit && (
            <Dialog open={openAddAssignment} onOpenChange={setOpenAddAssignment}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Penugasan</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Penugasan Baharu</DialogTitle><DialogDescription>Tugaskan item ubat kepada pesakit ini.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Item Ubat</Label>
                    <Select value={newAssignment.item_id} onValueChange={v => setNewAssignment({ ...newAssignment, item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih item..." /></SelectTrigger>
                      <SelectContent>{items?.map(item => (<SelectItem key={item.id} value={item.id}>{item.nama_item} {item.kekuatan}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Dos</Label><Input value={newAssignment.dos} onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })} placeholder="cth: 1 tablet 500mg sekali sehari" /></div>
                  <div className="space-y-2"><Label>Tarikh Mula</Label><Input type="date" value={newAssignment.tarikh_mula_guna} onChange={e => setNewAssignment({ ...newAssignment, tarikh_mula_guna: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAddAssignment(false)}>Batal</Button>
                  <Button onClick={() => addAssignmentMutation.mutate(newAssignment)} disabled={!newAssignment.item_id || addAssignmentMutation.isPending}>
                    {addAssignmentMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {assignments?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Tiada penugasan.</div>
            ) : (
              assignments?.map(assignment => (
                <div key={assignment.id}>
                  {/* Clickable Row Header */}
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors text-left"
                    onClick={() => toggleExpand(assignment.id)}
                  >
                    <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="font-medium">{assignment.item?.nama_item}</div>
                        <div className="text-xs text-muted-foreground">{assignment.item?.kekuatan}</div>
                      </div>
                      <div className="text-sm">{assignment.dos || "-"}</div>
                      <div className="text-sm">{formatDate(assignment.tarikh_mula_guna)}</div>
                      <div>
                        <Badge variant={assignment.aktif ? "success" : "secondary"}>
                          {assignment.aktif ? "Aktif" : "Tamat"}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedAssignment === assignment.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {expandedAssignment === assignment.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 bg-accent/10 border-t border-border/50">
                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-wrap mb-4">
                            {assignment.aktif && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => { setOpenUpdateDose(assignment.id); setDoseUpdate({ dos: assignment.dos || "", catatan: "" }); }}>
                                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Kemaskini Dos
                                </Button>
                                {canSupply && (
                                  <Button size="sm" onClick={() => { setOpenSupply(assignment.id); setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" }); }}>
                                    <Package className="mr-1.5 h-3.5 w-3.5" /> Bekal Baru
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button size="sm" variant="destructive" onClick={() => stopAssignmentMutation.mutate(assignment.id)}>
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Tamatkan
                                  </Button>
                                )}
                              </>
                            )}
                            {!assignment.aktif && assignment.sebab_tamat && (
                              <p className="text-sm text-muted-foreground italic">Sebab tamat: {assignment.sebab_tamat}</p>
                            )}
                          </div>

                          {/* Tab Content: Dose History & Supply History */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Dose History */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5" /> Riwayat Dos
                              </h4>
                              <div className="bg-background/50 rounded-md border">
                                {doseHistory && doseHistory.length > 0 ? (
                                  <div className="divide-y divide-border/50 text-xs">
                                    {doseHistory.slice(0, 5).map((d: any) => (
                                      <div key={d.id} className="flex items-center justify-between px-3 py-2">
                                        <span className="font-medium">{d.dos}</span>
                                        <span className="text-muted-foreground">{formatDate(d.tarikh)} {d.dikemaskini_oleh?.nama ? `- ${d.dikemaskini_oleh.nama}` : ""}</span>
                                      </div>
                                    ))}
                                    {doseHistory.length > 5 && (
                                      <div className="px-3 py-2 text-center text-muted-foreground">+ {doseHistory.length - 5} lagi</div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">Tiada riwayat</p>
                                )}
                              </div>
                            </div>

                            {/* Supply History */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <ClipboardList className="h-3.5 w-3.5" /> Riwayat Bekalan
                              </h4>
                              <div className="bg-background/50 rounded-md border">
                                {supplyHistory && supplyHistory.length > 0 ? (
                                  <div className="divide-y divide-border/50 text-xs">
                                    {supplyHistory.slice(0, 5).map((record: any) => (
                                      <div key={record.id} className="flex items-center gap-2 px-3 py-2">
                                        <div className="flex-1">
                                          <span className="font-medium">{record.kuantiti} unit</span>
                                          <span className="text-muted-foreground ml-1">- {record.dos}</span>
                                        </div>
                                        <span className="text-muted-foreground">{formatDate(record.tarikh_dibekal)}</span>
                                        <div className="flex gap-0.5">
                                          <button className="p-0.5 hover:text-foreground text-muted-foreground" onClick={() => { setEditSupplyId(record.id); setEditSupplyData({ dos: record.dos, tempoh_dibekal: record.tempoh_dibekal || "", kuantiti: String(record.kuantiti), catatan_bekalan: record.catatan_bekalan || "" }); }}>
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button className="p-0.5 hover:text-destructive text-muted-foreground" onClick={() => { if (confirm("Padam?")) deleteSupplyMutation.mutate(record.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {supplyHistory.length > 5 && (
                                      <div className="px-3 py-2 text-center text-muted-foreground">+ {supplyHistory.length - 5} lagi</div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">Tiada riwayat</p>
                                )}
                              </div>
                            </div>
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

      {/* Update Dose Dialog */}
      <Dialog open={!!openUpdateDose} onOpenChange={() => setOpenUpdateDose(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kemaskini Dos</DialogTitle><DialogDescription>Kemaskini dos untuk penugasan ini.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Dos Baru</Label><Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} placeholder="cth: 1 tablet 500mg sekali sehari" /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={doseUpdate.catatan} onChange={e => setDoseUpdate({ ...doseUpdate, catatan: e.target.value })} placeholder="Sebab pertukaran dos (jika ada)" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdateDose(null)}>Batal</Button>
            <Button onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos, catatan: doseUpdate.catatan }); }} disabled={!doseUpdate.dos || updateDoseMutation.isPending}>
              {updateDoseMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supply Dialog */}
      <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bekal Ubat</DialogTitle><DialogDescription>Rekodkan bekalan ubat untuk pesakit ini.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Dos Semasa</Label><Input value={currentAssignment?.dos || "-"} readOnly className="bg-muted" /><p className="text-xs text-muted-foreground">Guna butang <strong>Kemaskini Dos</strong> untuk menukar dos.</p></div>
            <div className="space-y-2"><Label>Kelompok (Batch)</Label>
              <Select value={supplyData.batch_id} onValueChange={v => setSupplyData({ ...supplyData, batch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kelompok..." /></SelectTrigger>
                <SelectContent>
                  {availableBatches?.map(batch => (<SelectItem key={batch.id} value={batch.id}>{batch.nombor_kelompok} - Stok: {batch.kuantiti} - Luput: {formatDate(batch.tarikh_luput)}</SelectItem>))}
                  {availableBatches?.length === 0 && <SelectItem value="none" disabled>Tiada kelompok tersedia</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tempoh Bekalan</Label>
              <div className="flex gap-2">
                <Input type="number" className="w-24" placeholder="cth: 30" value={supplyData.tempoh_nilai} onChange={e => setSupplyData({ ...supplyData, tempoh_nilai: e.target.value })} />
                <Select value={supplyData.tempoh_unit} onValueChange={v => setSupplyData({ ...supplyData, tempoh_unit: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Hari">Hari</SelectItem><SelectItem value="Minggu">Minggu</SelectItem><SelectItem value="Bulan">Bulan</SelectItem></SelectContent>
                </Select>
                <span className="flex items-center text-sm text-muted-foreground">{supplyData.tempoh_nilai && `${supplyData.tempoh_nilai} ${supplyData.tempoh_unit}`}</span>
              </div>
            </div>
            <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={supplyData.catatan_bekalan} onChange={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSupply(null)}>Batal</Button>
            <Button onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply, dos: currentAssignment.dos || "" }); }} disabled={!supplyData.kuantiti || supplyMutation.isPending}>
              {supplyMutation.isPending ? "Menyimpan..." : "Bekal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}
    </div>
  );
}