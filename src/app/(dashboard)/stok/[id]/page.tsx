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
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, Trash2, History, Download, FileSpreadsheet, FileText, Search, X, ChevronDown, ChevronUp, Package, Users, Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { Item, ItemBatch } from "@/types";

type SortDir = "asc" | "desc";

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: { key: string; dir: SortDir } | null; onSort: (key: string) => void }) {
  const isActive = currentSort?.key === sortKey;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentSort?.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <div className="h-3 w-3 opacity-0" />
        )}
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

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const canEdit = hasPermission(profile?.peranan, "manage_items");
  const canManageBatches = hasPermission(profile?.peranan, "manage_batches");

  // Filters & sorts
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPatient, setFilterPatient] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [batchSort, setBatchSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [txSort, setTxSort] = useState<{ key: string; dir: SortDir } | null>(null);

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

  const { data: transactionHistory } = useQuery({
    queryKey: ["transaction-history", id],
    queryFn: async () => {
      const transactions: any[] = [];
      const { data: supplies } = await supabase
        .from("supply_records")
        .select("*, batch:item_batches(nombor_kelompok), assignment:patient_item_assignments(patient_id, patient:patients(nama)), staff:profiles!kakitangan_pembekal(nama)")
        .eq("batch.item_id", id)
        .order("tarikh_dibekal", { ascending: false })
        .limit(200);
      for (const s of supplies || []) {
        transactions.push({
          id: `supply-${s.id}`, tarikh: s.tarikh_dibekal, jenis: "Bekalan Kepada Pesakit",
          kelompok: s.batch?.nombor_kelompok || "-", perubahan: -s.kuantiti,
          keterangan: `Bekal ${s.kuantiti} unit kepada ${s.assignment?.patient?.nama || "pesakit"}`,
          kakitangan: s.staff?.nama || "-", pesakit: s.assignment?.patient?.nama || "-",
        });
      }
      const batchIds = batches?.map(b => b.id) || [];
      if (batchIds.length > 0) {
        const { data: adjustments } = await supabase
          .from("batch_adjustments")
          .select("*, staff:profiles!adjusted_by(nama), batch:item_batches(nombor_kelompok)")
          .in("batch_id", batchIds).order("created_at", { ascending: false }).limit(200);
        for (const a of adjustments || []) {
          transactions.push({
            id: `adj-${a.id}`, tarikh: a.created_at,
            jenis: a.reason === "Stok awal kelompok baharu" ? "Kelompok Baharu" : "Larasan Stok",
            kelompok: a.batch?.nombor_kelompok || "-", perubahan: a.change,
            keterangan: a.reason || "-", kakitangan: a.staff?.nama || "-", pesakit: "-",
          });
        }
      }
      transactions.sort((a, b) => new Date(b.tarikh).getTime() - new Date(a.tarikh).getTime());
      return transactions;
    },
    enabled: true,
  });

  // Sorting
  const sortData = (data: any[], sort: { key: string; dir: SortDir } | null) => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = (a[sort.key] || "").toString().toLowerCase();
      const bVal = (b[sort.key] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal, "ms");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  };

  const toggleSort = (sort: { key: string; dir: SortDir } | null, setSort: any, key: string) => {
    if (sort?.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, dir: "asc" });
    }
  };

  const sortedBatches = useMemo(() => sortData(batches || [], batchSort), [batches, batchSort]);

  const filteredTransactions = useMemo(() => {
    if (!transactionHistory) return [];
    let filtered = transactionHistory.filter(t => {
      if (filterDateFrom && new Date(t.tarikh) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(t.tarikh) > new Date(filterDateTo + "T23:59:59")) return false;
      if (filterPatient && !t.pesakit?.toLowerCase().includes(filterPatient.toLowerCase())) return false;
      if (filterStaff && !t.kakitangan?.toLowerCase().includes(filterStaff.toLowerCase())) return false;
      return true;
    });
    if (txSort) {
      filtered = sortData(filtered, txSort);
    }
    return filtered;
  }, [transactionHistory, filterDateFrom, filterDateTo, filterPatient, filterStaff, txSort]);

  const filteredPatients = useMemo(() => {
    if (!assignedPatients) return [];
    return assignedPatients.filter((a: any) =>
      !patientSearch || a.patient?.nama?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      a.patient?.nombor_kad_pengenalan?.includes(patientSearch)
    );
  }, [assignedPatients, patientSearch]);

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
    onSuccess: () => { toast.success("Item dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["item", id] }); queryClient.invalidateQueries({ queryKey: ["items"] }); },
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
    onSuccess: () => { toast.success("Kuantiti kelompok dikemaskini."); setEditBatchId(null); queryClient.invalidateQueries({ queryKey: ["batches", id] }); queryClient.invalidateQueries({ queryKey: ["transaction-history", id] }); },
    onError: () => toast.error("Gagal mengemaskini kuantiti."),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.from("item_batches").delete().eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kelompok dipadam."); queryClient.invalidateQueries({ queryKey: ["batches", id] }); queryClient.invalidateQueries({ queryKey: ["transaction-history", id] }); },
    onError: () => toast.error("Gagal memadam kelompok."),
  });

  const exportToExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Transaksi_Item");
      ws.addRow(["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan", "Pesakit"]);
      filteredTransactions.forEach((t: any) => ws.addRow([new Date(t.tarikh).toLocaleString("ms-MY"), t.jenis, t.kelompok, t.perubahan, t.keterangan, t.kakitangan, t.pesakit]));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Transaksi_${item?.kod_item || "item"}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Fail Excel berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport Excel."); }
  };

  const exportToPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.text(`Transaksi Item: ${item?.nama_item || ""}`, 14, 15);
      autoTable(doc, {
        head: [["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan"]],
        body: filteredTransactions.map((t: any) => [new Date(t.tarikh).toLocaleString("ms-MY"), t.jenis, t.kelompok, t.perubahan > 0 ? `+${t.perubahan}` : String(t.perubahan), t.keterangan, t.kakitangan]),
        startY: 25, styles: { fontSize: 7 },
      });
      doc.save(`Transaksi_${item?.kod_item || "item"}.pdf`);
      toast.success("Fail PDF berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport PDF."); }
  };

  if (!item) return <div className="flex items-center justify-center py-12">Memuatkan...</div>;

  const totalStock = batches?.reduce((sum, b) => sum + b.kuantiti, 0) || 0;
  const totalPatients = assignedPatients?.length || 0;
  const bakiKuota = item?.kuota != null ? Math.max(0, item.kuota - totalPatients) : null;

  // Transaction stats for selected duration
  const txStats = useMemo(() => {
    const stats = { total: 0, masuk: 0, keluar: 0, patients: new Set<string>() };
    for (const t of filteredTransactions) {
      stats.total++;
      if (t.perubahan > 0) stats.masuk += t.perubahan;
      if (t.perubahan < 0) stats.keluar += Math.abs(t.perubahan);
      if (t.pesakit && t.pesakit !== "-") stats.patients.add(t.pesakit);
    }
    return stats;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Stok & Item", href: "/stok" }, { label: item.nama_item || "Butiran Item" }]} />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/stok")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">Butiran Item</h1>
      </div>

      {/* 1. Item Info */}
      <FoldableCard title={item.nama_item + (item.kekuatan ? ` ${item.kekuatan}` : "")} defaultOpen={true} headerExtra={canEdit && !editMode ? <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setEditMode(true); setEditData(item); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button> : undefined}>
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div><span className="text-muted-foreground">Kod:</span> {item.kod_item}</div>
              <div><span className="text-muted-foreground">Nama Dagangan:</span> {item.nama_dagangan || "-"}</div>
              <div><span className="text-muted-foreground">Kekuatan:</span> {item.kekuatan || "-"}</div>
              {item.catatan && <div className="col-span-1"><span className="text-muted-foreground">Catatan:</span> {item.catatan}</div>}
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100"><Package className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-xs text-muted-foreground">Jumlah Stok</p><p className="text-lg font-bold">{totalStock}</p></div>
              </div>
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
                <div><p className="text-xs text-muted-foreground">Kuota</p><p className="text-lg font-bold">{item.kuota ?? "-"}</p></div>
              </div>
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><Users className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-xs text-muted-foreground">Jumlah Pesakit</p><p className="text-lg font-bold">{totalPatients}</p></div>
              </div>
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Activity className="h-5 w-5 text-amber-600" /></div>
                <div><p className="text-xs text-muted-foreground">Baki Kuota</p><p className="text-lg font-bold">{bakiKuota ?? "-"}</p></div>
              </div>
            </div>
          </>
        )}
      </FoldableCard>

      {/* 2. Pesakit Yang Menggunakan */}
      <FoldableCard title="Pesakit Yang Menggunakan" count={filteredPatients.length} defaultOpen={true}>
        {assignedPatients && assignedPatients.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Cari pesakit..." className="pl-8 h-8 text-sm" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
          </div>
        )}
        {filteredPatients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nama</TableHead><TableHead>No. KP</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((a: any) => (
                <TableRow key={a.patient?.id} className="cursor-pointer" onClick={() => router.push(`/pesakit/${a.patient?.id}`)}>
                  <TableCell>{a.patient?.nama}</TableCell>
                  <TableCell>{a.patient?.nombor_kad_pengenalan || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{patientSearch ? "Tiada pesakit sepadan." : "Tiada pesakit menggunakan item ini."}</p>
        )}
      </FoldableCard>

      {/* 3. Batches */}
      <FoldableCard title="Kelompok (Batches)" count={sortedBatches.length} defaultOpen={true} headerExtra={canManageBatches ? <Button size="sm" onClick={e => { e.stopPropagation(); setOpenAddBatch(true); }}><Plus className="mr-1 h-3.5 w-3.5" />Tambah</Button> : undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Nombor Kelompok" sortKey="nombor_kelompok" currentSort={batchSort} onSort={k => toggleSort(batchSort, setBatchSort, k)} />
              <SortableHeader label="Tarikh Luput" sortKey="tarikh_luput" currentSort={batchSort} onSort={k => toggleSort(batchSort, setBatchSort, k)} />
              <SortableHeader label="Kuantiti" sortKey="kuantiti" currentSort={batchSort} onSort={k => toggleSort(batchSort, setBatchSort, k)} />
              <TableHead>Status</TableHead>
              {canManageBatches && <TableHead className="w-[150px]">Tindakan</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBatches.length === 0 ? (
              <TableRow><TableCell colSpan={canManageBatches ? 5 : 4} className="text-center py-8 text-muted-foreground">Tiada kelompok.</TableCell></TableRow>
            ) : (
              sortedBatches.map(batch => {
                const isExpired = new Date(batch.tarikh_luput) < new Date();
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">{batch.nombor_kelompok}</TableCell>
                    <TableCell>{formatDate(batch.tarikh_luput)}</TableCell>
                    <TableCell>
                      {editBatchId === batch.id ? (
                        <div className="flex gap-1">
                          <Input type="number" className="w-24 h-7 text-sm" value={editBatchData.kuantiti} onChange={e => setEditBatchData({ kuantiti: e.target.value })} />
                          <Button size="sm" onClick={() => updateBatchMutation.mutate({ batchId: batch.id, kuantiti: parseInt(editBatchData.kuantiti), previousKuantiti: batch.kuantiti })}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditBatchId(null)}>✕</Button>
                        </div>
                      ) : batch.kuantiti}
                    </TableCell>
                    <TableCell><Badge variant={isExpired ? "destructive" : batch.kuantiti > 0 ? "success" : "secondary"}>{isExpired ? "Luput" : batch.kuantiti > 0 ? "Tersedia" : "Habis"}</Badge></TableCell>
                    {canManageBatches && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditBatchId(batch.id); setEditBatchData({ kuantiti: String(batch.kuantiti) }); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteBatchMutation.mutate(batch.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </FoldableCard>

      {/* Add Batch Dialog */}
      <Dialog open={openAddBatch} onOpenChange={setOpenAddBatch}>
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

      {/* 4. Transaction History */}
      <FoldableCard
        title="Sejarah Transaksi Item"
        count={filteredTransactions.length}
        defaultOpen={true}
        headerExtra={
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={exportToExcel} disabled={!filteredTransactions.length}><FileSpreadsheet className="mr-1 h-3 w-3" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={exportToPDF} disabled={!filteredTransactions.length}><FileText className="mr-1 h-3 w-3" /> PDF</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label className="text-xs">Tarikh Dari</Label><Input type="date" className="h-8 w-32 text-xs" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Tarikh Hingga</Label><Input type="date" className="h-8 w-32 text-xs" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Pesakit</Label>
              <Select value={filterPatient} onValueChange={setFilterPatient}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pesakit</SelectItem>
                  {uniquePatients.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Kakitangan</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kakitangan</SelectItem>
                  {uniqueStaff.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { const d = new Date(); d.setDate(1); const start = d.toISOString().split("T")[0]; const today = new Date().toISOString().split("T")[0]; setFilterDateFrom(start); setFilterDateTo(today); setFilterPatient(""); setFilterStaff(""); }}>
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>

          {/* Transaction Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"><BarChart3 className="h-5 w-5 text-gray-600" /></div>
              <div><p className="text-xs text-muted-foreground">Jumlah Transaksi</p><p className="text-lg font-bold">{txStats.total}</p></div>
            </div>
            <div className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">Item Masuk</p><p className="text-lg font-bold text-green-600">+{txStats.masuk}</p></div>
            </div>
            <div className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"><TrendingDown className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground">Item Keluar</p><p className="text-lg font-bold text-red-600">-{txStats.keluar}</p></div>
            </div>
            <div className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-muted-foreground">Pesakit Menerima</p><p className="text-lg font-bold">{txStats.patients.size}</p></div>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Tiada transaksi.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Tarikh" sortKey="tarikh" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                    <SortableHeader label="Jenis" sortKey="jenis" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                    <SortableHeader label="Kelompok" sortKey="kelompok" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                    <TableHead>Perubahan</TableHead>
                    <SortableHeader label="Keterangan" sortKey="keterangan" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                    <SortableHeader label="Kakitangan" sortKey="kakitangan" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                    <SortableHeader label="Pesakit" sortKey="pesakit" currentSort={txSort} onSort={k => toggleSort(txSort, setTxSort, k)} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(t.tarikh).toLocaleString("ms-MY")}</TableCell>
                      <TableCell className="text-xs">{t.jenis}</TableCell>
                      <TableCell className="font-mono text-xs">{t.kelompok}</TableCell>
                      <TableCell>
                        <Badge variant={t.perubahan >= 0 ? "success" : "destructive"} className="font-mono">
                          {t.perubahan >= 0 ? `+${t.perubahan}` : t.perubahan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{t.keterangan}</TableCell>
                      <TableCell className="text-xs">{t.kakitangan}</TableCell>
                      <TableCell className="text-xs">{t.pesakit || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </FoldableCard>
    </div>
  );
}