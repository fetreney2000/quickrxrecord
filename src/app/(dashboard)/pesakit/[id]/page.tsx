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
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Pill, Edit, XCircle, Package, Merge, History, Save, X, Trash2 } from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, SupplyRecord, ItemBatch } from "@/types";

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
  const [supplyData, setSupplyData] = useState({ dos: "", tempoh_dibekal: "", kuantiti: "", batch_id: "", catatan_bekalan: "" });
  const [openMerge, setOpenMerge] = useState(false);
  const [viewHistoryAssignment, setViewHistoryAssignment] = useState<string | null>(null);
  const [editSupplyId, setEditSupplyId] = useState<string | null>(null);
  const [editSupplyData, setEditSupplyData] = useState({ dos: "", tempoh_dibekal: "", kuantiti: "", catatan_bekalan: "" });

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

  // Fetch supply history for a specific assignment
  const { data: supplyHistory } = useQuery({
    queryKey: ["supply-history", viewHistoryAssignment],
    queryFn: async () => {
      if (!viewHistoryAssignment) return [];
      const { data, error } = await supabase
        .from("supply_records")
        .select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)")
        .eq("assignment_id", viewHistoryAssignment)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!viewHistoryAssignment,
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

  // Fetch batches for supply
  const { data: availableBatches } = useQuery({
    queryKey: ["batches-for-supply", openSupply],
    queryFn: async () => {
      if (!openSupply) return [];
      const assignment = assignments?.find(a => a.id === openSupply);
      if (!assignment) return [];
      const { data, error } = await supabase
        .from("item_batches")
        .select("*")
        .eq("item_id", assignment.item_id)
        .gt("kuantiti", 0)
        .gte("tarikh_luput", new Date().toISOString().split("T")[0])
        .order("tarikh_luput", { ascending: true });
      if (error) throw error;
      return data as ItemBatch[];
    },
    enabled: !!openSupply,
  });

  // Supply mutation
  const supplyMutation = useMutation({
    mutationFn: async (data: typeof supplyData & { assignment_id: string }) => {
      // Update dose if changed
      const assignment = assignments?.find(a => a.id === data.assignment_id);
      if (assignment && data.dos !== assignment.dos) {
        await supabase.from("patient_item_assignments").update({ dos: data.dos }).eq("id", data.assignment_id);
      }

      // Create supply record
      const { error: insertError } = await supabase.from("supply_records").insert({
        assignment_id: data.assignment_id,
        dos: data.dos,
        tempoh_dibekal: data.tempoh_dibekal,
        kuantiti: parseInt(data.kuantiti),
        batch_id: data.batch_id || null,
        kakitangan_pembekal: profile?.id || "",
        catatan_bekalan: data.catatan_bekalan || null,
      });
      if (insertError) throw insertError;

      // Decrement batch quantity
      if (data.batch_id) {
        const batch = availableBatches?.find(b => b.id === data.batch_id);
        if (batch) {
          const { error: updateError } = await supabase
            .from("item_batches")
            .update({ kuantiti: batch.kuantiti - parseInt(data.kuantiti) })
            .eq("id", data.batch_id);
          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Bekalan berjaya direkodkan.");
      setOpenSupply(null);
      setSupplyData({ dos: "", tempoh_dibekal: "", kuantiti: "", batch_id: "", catatan_bekalan: "" });
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
      queryClient.invalidateQueries({ queryKey: ["supply-history", viewHistoryAssignment] });
    },
    onError: () => toast.error("Gagal memadam rekod bekalan."),
  });

  // Edit supply mutation
  const editSupplyMutation = useMutation({
    mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: typeof editSupplyData }) => {
      const { error } = await supabase.from("supply_records").update({
        dos: updates.dos,
        tempoh_dibekal: updates.tempoh_dibekal,
        kuantiti: parseInt(updates.kuantiti),
        catatan_bekalan: updates.catatan_bekalan || null,
      }).eq("id", supplyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rekod bekalan dikemaskini.");
      setEditSupplyId(null);
      queryClient.invalidateQueries({ queryKey: ["supply-history", viewHistoryAssignment] });
    },
    onError: () => toast.error("Gagal mengemaskini rekod bekalan."),
  });

  if (!patient) {
    return <div className="flex items-center justify-center py-12">Memuatkan...</div>;
  }

  const selectedAssignment = assignments?.find(a => a.id === viewHistoryAssignment);

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
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setOpenMerge(true)}>
                <Merge className="mr-2 h-4 w-4" /> Gabung
              </Button>
            )}
            {canEdit && !editMode && (
              <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditData(patient); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
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
              <div className="flex gap-2">
                <Button onClick={() => updatePatientMutation.mutate(editData)} disabled={updatePatientMutation.isPending}>Simpan</Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
              </div>
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

      {/* Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Penugasan Item</CardTitle>
          {canEdit && (
            <Dialog open={openAddAssignment} onOpenChange={setOpenAddAssignment}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Penugasan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Penugasan Baharu</DialogTitle>
                  <DialogDescription>Tugaskan item ubat kepada pesakit ini.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Item Ubat</Label>
                    <Select value={newAssignment.item_id} onValueChange={v => setNewAssignment({ ...newAssignment, item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih item..." /></SelectTrigger>
                      <SelectContent>
                        {items?.map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.nama_item} {item.kekuatan}</SelectItem>
                        ))}
                      </SelectContent>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Item</TableHead>
                <TableHead>Dos</TableHead>
                <TableHead>Tarikh Mula</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[280px]">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tiada penugasan.</TableCell></TableRow>
              ) : (
                assignments?.map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.item?.nama_item} {assignment.item?.kekuatan}
                    </TableCell>
                    <TableCell>{assignment.dos || "-"}</TableCell>
                    <TableCell>{formatDate(assignment.tarikh_mula_guna)}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.aktif ? "success" : "secondary"}>
                        {assignment.aktif ? "Aktif" : "Tamat"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewHistoryAssignment(assignment.id)}>
                          <History className="mr-1 h-3 w-3" /> Sejarah
                        </Button>
                        {canSupply && assignment.aktif && (
                          <Button size="sm" onClick={() => {
                            setOpenSupply(assignment.id);
                            setSupplyData({ dos: assignment.dos || "", tempoh_dibekal: "", kuantiti: "", batch_id: "", catatan_bekalan: "" });
                          }}>
                            <Package className="mr-1 h-3 w-3" /> Bekal
                          </Button>
                        )}
                        {canEdit && assignment.aktif && (
                          <Button size="sm" variant="destructive" onClick={() => stopAssignmentMutation.mutate(assignment.id)}>
                            <XCircle className="mr-1 h-3 w-3" /> Tamat
                          </Button>
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

      {/* Supply History Dialog */}
      <Dialog open={!!viewHistoryAssignment} onOpenChange={() => { setViewHistoryAssignment(null); setEditSupplyId(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sejarah Bekalan</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.item?.nama_item} {selectedAssignment?.item?.kekuatan} - Dos: {selectedAssignment?.dos || "-"}
            </DialogDescription>
          </DialogHeader>
          {supplyHistory && supplyHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Dos</TableHead>
                  <TableHead>Tempoh</TableHead>
                  <TableHead>Kuantiti</TableHead>
                  <TableHead>Kelompok</TableHead>
                  <TableHead>Kakitangan</TableHead>
                  <TableHead className="w-[120px]">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplyHistory.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.tarikh_dibekal)}</TableCell>
                    <TableCell>
                      {editSupplyId === record.id ? (
                        <Input value={editSupplyData.dos} onChange={e => setEditSupplyData({ ...editSupplyData, dos: e.target.value })} className="h-7 w-28" />
                      ) : (
                        record.dos
                      )}
                    </TableCell>
                    <TableCell>
                      {editSupplyId === record.id ? (
                        <Input value={editSupplyData.tempoh_dibekal} onChange={e => setEditSupplyData({ ...editSupplyData, tempoh_dibekal: e.target.value })} className="h-7 w-20" />
                      ) : (
                        record.tempoh_dibekal || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {editSupplyId === record.id ? (
                        <Input type="number" value={editSupplyData.kuantiti} onChange={e => setEditSupplyData({ ...editSupplyData, kuantiti: e.target.value })} className="h-7 w-16" />
                      ) : (
                        record.kuantiti
                      )}
                    </TableCell>
                    <TableCell>{record.batch?.nombor_kelompok || "-"}</TableCell>
                    <TableCell>{record.staff?.nama || "-"}</TableCell>
                    <TableCell>
                      {editSupplyId === record.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => editSupplyMutation.mutate({ supplyId: record.id, updates: editSupplyData })} disabled={editSupplyMutation.isPending}>
                            <Save className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSupplyId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditSupplyId(record.id); setEditSupplyData({ dos: record.dos, tempoh_dibekal: record.tempoh_dibekal || "", kuantiti: String(record.kuantiti), catatan_bekalan: record.catatan_bekalan || "" }); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (confirm("Padam rekod bekalan ini?")) deleteSupplyMutation.mutate(record.id);
                          }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Tiada rekod bekalan untuk penugasan ini.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Supply Dialog */}
      <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekal Ubat</DialogTitle>
            <DialogDescription>Rekodkan bekalan ubat untuk pesakit ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dos Semasa</Label>
              <Input value={supplyData.dos} onChange={e => setSupplyData({ ...supplyData, dos: e.target.value })} />
              <p className="text-xs text-muted-foreground">Edit dos jika perlu. Dos baharu akan dikemaskini pada penugasan.</p>
            </div>
            <div className="space-y-2">
              <Label>Kelompok (Batch)</Label>
              <Select value={supplyData.batch_id} onValueChange={v => setSupplyData({ ...supplyData, batch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kelompok..." /></SelectTrigger>
                <SelectContent>
                  {availableBatches?.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.nombor_kelompok} - Stok: {batch.kuantiti} - Luput: {formatDate(batch.tarikh_luput)}
                    </SelectItem>
                  ))}
                  {availableBatches?.length === 0 && (
                    <SelectItem value="none" disabled>Tiada kelompok tersedia</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tempoh Bekalan (hari)</Label><Input type="number" value={supplyData.tempoh_dibekal} onChange={e => setSupplyData({ ...supplyData, tempoh_dibekal: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={supplyData.catatan_bekalan} onChange={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSupply(null)}>Batal</Button>
            <Button onClick={() => { if (openSupply) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply }); }} disabled={!supplyData.kuantiti || supplyMutation.isPending}>
              {supplyMutation.isPending ? "Menyimpan..." : "Bekal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {patient && (
        <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />
      )}
    </div>
  );
}