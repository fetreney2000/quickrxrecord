"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import type { Item, ItemBatch } from "@/types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const canEdit = hasPermission(profile?.peranan, "manage_items");
  const canManageBatches = hasPermission(profile?.peranan, "manage_batches");

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Item>>({});
  const [openAddBatch, setOpenAddBatch] = useState(false);
  const [newBatch, setNewBatch] = useState({ nombor_kelompok: "", tarikh_luput: "", kuantiti: "" });
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editBatchData, setEditBatchData] = useState({ kuantiti: "" });

  const { data: item } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Item;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["batches", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_batches").select("*").eq("item_id", id).order("tarikh_luput");
      if (error) throw error;
      return data as ItemBatch[];
    },
  });

  const { data: assignedPatients } = useQuery({
    queryKey: ["item-patients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_item_assignments")
        .select("patient:patients(id, nama, nombor_kad_pengenalan)")
        .eq("item_id", id)
        .eq("aktif", true);
      if (error) throw error;
      return data;
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      const { error } = await supabase.from("items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item dikemaskini.");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
    onError: () => toast.error("Gagal mengemaskini item."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (batch: typeof newBatch) => {
      const { error } = await supabase.from("item_batches").insert({
        item_id: id,
        nombor_kelompok: batch.nombor_kelompok,
        tarikh_luput: batch.tarikh_luput,
        kuantiti: parseInt(batch.kuantiti),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kelompok berjaya ditambah.");
      setOpenAddBatch(false);
      setNewBatch({ nombor_kelompok: "", tarikh_luput: "", kuantiti: "" });
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
    },
    onError: () => toast.error("Gagal menambah kelompok."),
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, kuantiti }: { batchId: string; kuantiti: number }) => {
      const { error } = await supabase.from("item_batches").update({ kuantiti }).eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kuantiti kelompok dikemaskini.");
      setEditBatchId(null);
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
    },
    onError: () => toast.error("Gagal mengemaskini kuantiti."),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.from("item_batches").delete().eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kelompok dipadam.");
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
    },
    onError: () => toast.error("Gagal memadam kelompok."),
  });

  if (!item) {
    return <div className="flex items-center justify-center py-12">Memuatkan...</div>;
  }

  const totalStock = batches?.reduce((sum, b) => sum + b.kuantiti, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/stok")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Butiran Item</h1>
      </div>

      {/* Item Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{item.nama_item} {item.kekuatan}</CardTitle>
          {canEdit && !editMode && (
            <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditData(item); }}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Kod Item</Label><Input value={editData.kod_item || ""} onChange={e => setEditData({ ...editData, kod_item: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nama Item</Label><Input value={editData.nama_item || ""} onChange={e => setEditData({ ...editData, nama_item: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nama Dagangan</Label><Input value={editData.nama_dagangan || ""} onChange={e => setEditData({ ...editData, nama_dagangan: e.target.value })} /></div>
                <div className="space-y-2"><Label>Kekuatan</Label><Input value={editData.kekuatan || ""} onChange={e => setEditData({ ...editData, kekuatan: e.target.value })} /></div>
                <div className="space-y-2"><Label>Kuota</Label><Input type="number" value={editData.kuota ?? ""} onChange={e => setEditData({ ...editData, kuota: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateItemMutation.mutate(editData)} disabled={updateItemMutation.isPending}>Simpan</Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Kod:</span> {item.kod_item}</div>
              <div><span className="text-muted-foreground">Nama Dagangan:</span> {item.nama_dagangan || "-"}</div>
              <div><span className="text-muted-foreground">Kekuatan:</span> {item.kekuatan || "-"}</div>
              <div><span className="text-muted-foreground">Kuota:</span> {item.kuota ?? "-"}</div>
              <div><span className="text-muted-foreground">Jumlah Stok:</span> <Badge variant={totalStock > 0 ? "success" : "destructive"}>{totalStock}</Badge></div>
              {item.catatan && <div className="col-span-3"><span className="text-muted-foreground">Catatan:</span> {item.catatan}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Kelompok (Batches)</CardTitle>
          {canManageBatches && (
            <Dialog open={openAddBatch} onOpenChange={setOpenAddBatch}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Kelompok</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Kelompok Baharu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nombor Kelompok *</Label><Input value={newBatch.nombor_kelompok} onChange={e => setNewBatch({ ...newBatch, nombor_kelompok: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Tarikh Luput *</Label><Input type="date" value={newBatch.tarikh_luput} onChange={e => setNewBatch({ ...newBatch, tarikh_luput: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Kuantiti *</Label><Input type="number" value={newBatch.kuantiti} onChange={e => setNewBatch({ ...newBatch, kuantiti: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAddBatch(false)}>Batal</Button>
                  <Button onClick={() => addBatchMutation.mutate(newBatch)} disabled={!newBatch.nombor_kelompok || !newBatch.tarikh_luput || !newBatch.kuantiti || addBatchMutation.isPending}>
                    {addBatchMutation.isPending ? "Menyimpan..." : "Simpan"}
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
                <TableHead>Nombor Kelompok</TableHead>
                <TableHead>Tarikh Luput</TableHead>
                <TableHead>Kuantiti</TableHead>
                <TableHead>Status</TableHead>
                {canManageBatches && <TableHead className="w-[150px]">Tindakan</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches?.length === 0 ? (
                <TableRow><TableCell colSpan={canManageBatches ? 5 : 4} className="text-center py-8 text-muted-foreground">Tiada kelompok.</TableCell></TableRow>
              ) : (
                batches?.map(batch => {
                  const isExpired = new Date(batch.tarikh_luput) < new Date();
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono">{batch.nombor_kelompok}</TableCell>
                      <TableCell>{formatDate(batch.tarikh_luput)}</TableCell>
                      <TableCell>
                        {editBatchId === batch.id ? (
                          <div className="flex gap-1">
                            <Input type="number" className="w-24" value={editBatchData.kuantiti} onChange={e => setEditBatchData({ kuantiti: e.target.value })} />
                            <Button size="sm" onClick={() => updateBatchMutation.mutate({ batchId: batch.id, kuantiti: parseInt(editBatchData.kuantiti) })}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditBatchId(null)}>✕</Button>
                          </div>
                        ) : (
                          batch.kuantiti
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isExpired ? "destructive" : batch.kuantiti > 0 ? "success" : "secondary"}>
                          {isExpired ? "Luput" : batch.kuantiti > 0 ? "Tersedia" : "Habis"}
                        </Badge>
                      </TableCell>
                      {canManageBatches && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditBatchId(batch.id); setEditBatchData({ kuantiti: String(batch.kuantiti) }); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteBatchMutation.mutate(batch.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assigned Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Pesakit Yang Ditugaskan</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedPatients && assignedPatients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>No. KP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedPatients.map((a: any) => (
                  <TableRow key={a.patient?.id} className="cursor-pointer" onClick={() => router.push(`/pesakit/${a.patient?.id}`)}>
                    <TableCell>{a.patient?.nama}</TableCell>
                    <TableCell>{a.patient?.nombor_kad_pengenalan || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Tiada pesakit ditugaskan untuk item ini.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}