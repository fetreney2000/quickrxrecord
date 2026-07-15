"use client";

import React, { useState, useMemo } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, Trash2, History, Download, FileSpreadsheet, FileText, Search, X } from "lucide-react";
import type { Item, ItemBatch } from "@/types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const canEdit = hasPermission(profile?.peranan, "manage_items");
  const canManageBatches = hasPermission(profile?.peranan, "manage_batches");

  // Filters for transaction history
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPatient, setFilterPatient] = useState("");
  const [filterStaff, setFilterStaff] = useState("");

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

  // Full transaction history combining adjustments, supplies, and batch creation
  const { data: transactionHistory } = useQuery({
    queryKey: ["transaction-history", id],
    queryFn: async () => {
      const transactions: any[] = [];

      // Get supplies to patients
      const { data: supplies } = await supabase
        .from("supply_records")
        .select("*, batch:item_batches(nombor_kelompok), assignment:patient_item_assignments(patient_id, patient:patients(nama)), staff:profiles!kakitangan_pembekal(nama)")
        .eq("batch.item_id", id)
        .order("tarikh_dibekal", { ascending: false })
        .limit(200);

      for (const s of supplies || []) {
        transactions.push({
          id: `supply-${s.id}`,
          tarikh: s.tarikh_dibekal,
          jenis: "Bekalan Kepada Pesakit",
          kelompok: s.batch?.nombor_kelompok || "-",
          perubahan: -s.kuantiti,
          keterangan: `Bekal ${s.kuantiti} unit kepada ${s.assignment?.patient?.nama || "pesakit"}`,
          kakitangan: s.staff?.nama || "-",
          pesakit: s.assignment?.patient?.nama || "-",
        });
      }

      // Get batch adjustments
      const batchIds = batches?.map(b => b.id) || [];
      if (batchIds.length > 0) {
        const { data: adjustments } = await supabase
          .from("batch_adjustments")
          .select("*, staff:profiles!adjusted_by(nama), batch:item_batches(nombor_kelompok)")
          .in("batch_id", batchIds)
          .order("created_at", { ascending: false })
          .limit(200);

        for (const a of adjustments || []) {
          transactions.push({
            id: `adj-${a.id}`,
            tarikh: a.created_at,
            jenis: a.reason === "Stok awal kelompok baharu" ? "Kelompok Baharu" : "Larasan Stok",
            kelompok: a.batch?.nombor_kelompok || "-",
            perubahan: a.change,
            keterangan: a.reason || "-",
            kakitangan: a.staff?.nama || "-",
            pesakit: "-",
          });
        }
      }

      // Sort by date descending
      transactions.sort((a, b) => new Date(b.tarikh).getTime() - new Date(a.tarikh).getTime());
      return transactions;
    },
    enabled: true,
  });

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!transactionHistory) return [];
    return transactionHistory.filter(t => {
      if (filterDateFrom && new Date(t.tarikh) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(t.tarikh) > new Date(filterDateTo + "T23:59:59")) return false;
      if (filterPatient && !t.pesakit?.toLowerCase().includes(filterPatient.toLowerCase())) return false;
      if (filterStaff && !t.kakitangan?.toLowerCase().includes(filterStaff.toLowerCase())) return false;
      return true;
    });
  }, [transactionHistory, filterDateFrom, filterDateTo, filterPatient, filterStaff]);

  // Unique patients and staff for filter dropdowns
  const uniquePatients = useMemo(() => {
    const set = new Set<string>();
    (transactionHistory || []).forEach(t => { if (t.pesakit && t.pesakit !== "-") set.add(t.pesakit); });
    return [...set].sort();
  }, [transactionHistory]);

  const uniqueStaff = useMemo(() => {
    const set = new Set<string>();
    (transactionHistory || []).forEach(t => { if (t.kakitangan && t.kakitangan !== "-") set.add(t.kakitangan); });
    return [...set].sort();
  }, [transactionHistory]);

  const updateItemMutation = useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      const { error } = await supabase.from("items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item dikemaskini.");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => toast.error("Gagal mengemaskini item."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (batch: typeof newBatch) => {
      const kuantiti = parseInt(batch.kuantiti);
      const { data, error } = await supabase.from("item_batches").insert({
        item_id: id, nombor_kelompok: batch.nombor_kelompok, tarikh_luput: batch.tarikh_luput, kuantiti,
      }).select().single();
      if (error) throw error;
      await supabase.from("batch_adjustments").insert({
        batch_id: data.id, previous_kuantiti: 0, new_kuantiti: kuantiti, change: kuantiti,
        reason: "Stok awal kelompok baharu", adjusted_by: profile?.id,
      });
    },
    onSuccess: () => {
      toast.success("Kelompok berjaya ditambah.");
      setOpenAddBatch(false);
      setNewBatch({ nombor_kelompok: "", tarikh_luput: "", kuantiti: "" });
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["transaction-history", id] });
    },
    onError: () => toast.error("Gagal menambah kelompok."),
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, kuantiti, previousKuantiti }: { batchId: string; kuantiti: number; previousKuantiti: number }) => {
      const change = kuantiti - previousKuantiti;
      await supabase.from("batch_adjustments").insert({
        batch_id: batchId, previous_kuantiti: previousKuantiti, new_kuantiti: kuantiti, change,
        reason: "Larasan stok manual", adjusted_by: profile?.id,
      });
      const { error } = await supabase.from("item_batches").update({ kuantiti }).eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kuantiti kelompok dikemaskini.");
      setEditBatchId(null);
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
      queryClient.invalidateQueries({ queryKey: ["transaction-history", id] });
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
      queryClient.invalidateQueries({ queryKey: ["transaction-history", id] });
    },
    onError: () => toast.error("Gagal memadam kelompok."),
  });

  // Excel export (client-side)
  const exportToExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Transaksi_Item");
      ws.addRow(["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan", "Pesakit"]);
      filteredTransactions.forEach(t => ws.addRow([
        new Date(t.tarikh).toLocaleString("ms-MY"), t.jenis, t.kelompok,
        t.perubahan, t.keterangan, t.kakitangan, t.pesakit,
      ]));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Transaksi_${item?.kod_item || "item"}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Fail Excel berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport Excel."); }
  };

  // PDF export (client-side)
  const exportToPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.text(`Transaksi Item: ${item?.nama_item || ""}`, 14, 15);
      autoTable(doc, {
        head: [["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan"]],
        body: filteredTransactions.map(t => [
          new Date(t.tarikh).toLocaleString("ms-MY"), t.jenis, t.kelompok,
          t.perubahan > 0 ? `+${t.perubahan}` : String(t.perubahan),
          t.keterangan, t.kakitangan,
        ]),
        startY: 25, styles: { fontSize: 7 },
      });
      doc.save(`Transaksi_${item?.kod_item || "item"}.pdf`);
      toast.success("Fail PDF berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport PDF."); }
  };

  if (!item) {
    return <div className="flex items-center justify-center py-12">Memuatkan...</div>;
  }

  const totalStock = batches?.reduce((sum, b) => sum + b.kuantiti, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[
          { label: "Papan Pemuka", href: "/" },
          { label: "Stok & Item", href: "/stok" },
          { label: item.nama_item || "Butiran Item" },
        ]} />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/stok")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Butiran Item</h1>
      </div>

      {/* 1. Item Info */}
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

      {/* 2. Pesakit Yang Menggunakan */}
      <Card>
        <CardHeader>
          <CardTitle>Pesakit Yang Menggunakan</CardTitle>
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
            <p className="text-sm text-muted-foreground">Tiada pesakit menggunakan item ini.</p>
          )}
        </CardContent>
      </Card>

      {/* 3. Batches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Kelompok (Batches)</CardTitle>
          {canManageBatches && (
            <Dialog open={openAddBatch} onOpenChange={setOpenAddBatch}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Kelompok</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Kelompok Baharu</DialogTitle></DialogHeader>
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
                            <Button size="sm" onClick={() => updateBatchMutation.mutate({ batchId: batch.id, kuantiti: parseInt(editBatchData.kuantiti), previousKuantiti: batch.kuantiti })}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditBatchId(null)}>✕</Button>
                          </div>
                        ) : batch.kuantiti}
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

      {/* 4. Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Sejarah Transaksi Item
              {transactionHistory && <Badge variant="secondary" className="ml-2">{transactionHistory.length}</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportToExcel} disabled={!filteredTransactions.length}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={exportToPDF} disabled={!filteredTransactions.length}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tarikh Dari</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tarikh Hingga</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pesakit</Label>
              <Select value={filterPatient} onValueChange={setFilterPatient}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Semua Pesakit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pesakit</SelectItem>
                  {uniquePatients.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kakitangan</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Semua Kakitangan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kakitangan</SelectItem>
                  {uniqueStaff.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(filterDateFrom || filterDateTo || filterPatient || filterStaff) && (
              <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterPatient(""); setFilterStaff(""); }}>
                <X className="h-3 w-3 mr-1" /> Reset
              </Button>
            )}
          </div>

          {/* Transaction Table */}
          {filteredTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Tiada transaksi.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kelompok</TableHead>
                    <TableHead>Perubahan</TableHead>
                    <TableHead>Baki Stok</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Kakitangan</TableHead>
                    <TableHead>Pesakit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t: any) => {
                    const isIncrease = t.perubahan >= 0;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(t.tarikh).toLocaleString("ms-MY")}</TableCell>
                        <TableCell className="text-xs">{t.jenis}</TableCell>
                        <TableCell className="font-mono text-xs">{t.kelompok}</TableCell>
                        <TableCell>
                          <Badge variant={isIncrease ? "success" : "destructive"} className="font-mono">
                            {isIncrease ? `+${t.perubahan}` : t.perubahan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{t.baki_stok ?? "-"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{t.keterangan}</TableCell>
                        <TableCell className="text-xs">{t.kakitangan}</TableCell>
                        <TableCell className="text-xs">{t.pesakit || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}