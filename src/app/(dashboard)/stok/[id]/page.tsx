"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { formatDate, getKLDate, toTitleCaseKeepAcronyms } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, Trash2, History, Download, FileSpreadsheet, FileText, Search, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Package, Users, Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { setNavSource } from "@/components/ui/breadcrumb";
import type { Item, ItemBatch, ItemForm, ItemCategory } from "@/types";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

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
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.1 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </CardHeader>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
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
  const [defaulterFilter, setDefaulterFilter] = useState("");
  const [batchSort, setBatchSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [txSort, setTxSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [patientSort, setPatientSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [patientPage, setPatientPage] = useState(0);
  const [batchPage, setBatchPage] = useState(0);
  const [txPage, setTxPage] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Item>>({});
  const [openAddBatch, setOpenAddBatch] = useState(false);
  const [newBatch, setNewBatch] = useState({ nombor_kelompok: "", tarikh_luput: "", kuantiti: "" });
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editBatchData, setEditBatchData] = useState({ kuantiti: "" });
  const [pendingBatchAction, setPendingBatchAction] = useState<{ type: string; batch: ItemBatch; newKuantiti?: number } | null>(null);

  const { data: item } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Item;
    },
  });

  const { data: forms } = useQuery({
    queryKey: ["item_forms"],
    queryFn: async () => {
      const { data } = await supabase.from("item_forms").select("id, nama");
      return (data || []) as Pick<ItemForm, "id" | "nama">[];
    },
    staleTime: 60000,
  });

  const { data: categories } = useQuery({
    queryKey: ["item_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("item_categories").select("id, nama");
      return (data || []) as Pick<ItemCategory, "id" | "nama">[];
    },
    staleTime: 60000,
  });

  const currentFormName = useMemo(() => {
    if (!item?.id_bentuk || !forms) return "";
    return forms.find(f => f.id === item.id_bentuk)?.nama || "";
  }, [item, forms]);

  const currentCategoryName = useMemo(() => {
    if (!item?.id_kategori || !categories) return "";
    return categories.find(c => c.id === item.id_kategori)?.nama || "";
  }, [item, categories]);

  const itemDisplayName = useMemo(() => {
    if (!item) return "";
    return [item.nama_item, item.kekuatan, currentFormName].filter(Boolean).join(" ");
  }, [item, currentFormName]);

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
      // Get active assignments
      const { data: activeAssigns, error: assgnErr } = await supabase
        .from("patient_item_assignments")
        .select("id, patient_id, dos")
        .eq("item_id", id)
        .eq("aktif", true);
      if (assgnErr) throw assgnErr;
      if (!activeAssigns?.length) return [];

      // Get patient details separately, batching to avoid .in() limit
      const uniquePatientIds = [...new Set(activeAssigns.map((a: any) => a.patient_id))];
      const BATCH_SIZE = 200;
      const patientMap = new Map<string, any>();
      for (let i = 0; i < uniquePatientIds.length; i += BATCH_SIZE) {
        const batch = uniquePatientIds.slice(i, i + BATCH_SIZE);
        const { data: patients } = await supabase
          .from("patients")
          .select("id, nama, nombor_kad_pengenalan")
          .in("id", batch);
        for (const p of patients || []) patientMap.set(p.id, p);
      }

      // Get ALL assignments for this item (for supply history lookup)
      const { data: allAssigns } = await supabase
        .from("patient_item_assignments")
        .select("id, patient_id")
        .eq("item_id", id);
      const allAssignIds = (allAssigns || []).map((a: any) => a.id);

      // Get latest supply date per patient, batched
      const psl = new Map<string, string>();
      if (allAssignIds.length > 0) {
        const a2p = new Map<string, string>();
        for (const a of allAssigns || []) a2p.set(a.id, a.patient_id);
        for (let i = 0; i < allAssignIds.length; i += BATCH_SIZE) {
          const batch = allAssignIds.slice(i, i + BATCH_SIZE);
          const { data: supplies } = await supabase
            .from("supply_records")
            .select("assignment_id, tarikh_dibekal")
            .in("assignment_id", batch)
            .order("tarikh_dibekal", { ascending: false });
          for (const s of supplies || []) {
            const pid = a2p.get(s.assignment_id);
            if (pid && !psl.has(pid)) psl.set(pid, s.tarikh_dibekal);
          }
        }
      }

      return activeAssigns.map((a: any) => {
        const p = patientMap.get(a.patient_id);
        return {
          id: a.id,
          patient_id: a.patient_id,
          dos: a.dos,
          patient: {
            id: a.patient_id,
            nama: (p && p.nama) ? p.nama : "-",
            nombor_kad_pengenalan: (p && p.nombor_kad_pengenalan) ? p.nombor_kad_pengenalan : "-"
          },
          last_supply: psl.get(a.patient_id) || null,
        };
      });
    },
  });

  useEffect(() => {
    if (!filterDateFrom) {
      const klDate = getKLDate();
      const kl = new Date(klDate);
      const start = `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, "0")}-01`;
      setFilterDateFrom(start);
      setFilterDateTo(klDate);
    }
  }, [filterDateFrom]);

  const { data: transactionHistory } = useQuery({
    queryKey: ["transaction-history", id],
    queryFn: async () => {
      const transactions: any[] = [];
      // Get all assignment IDs for this item
      const { data: assignments } = await supabase
        .from("patient_item_assignments")
        .select("id")
        .eq("item_id", id);
      const assignmentIds = (assignments || []).map(a => a.id);
      const { data: supplies } = await supabase
        .from("supply_records")
        .select("*, batch:item_batches(nombor_kelompok), assignment:patient_item_assignments(patient_id, patient:patients(nama)), staff:profiles!kakitangan_pembekal(nama)")
        .in("assignment_id", assignmentIds.length > 0 ? assignmentIds : ["none"])
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
      // Get all batch IDs for this item directly
      const { data: allBatches } = await supabase
        .from("item_batches")
        .select("id")
        .eq("item_id", id);
      const batchIds = (allBatches || []).map(b => b.id);
      if (batchIds.length > 0) {
        const { data: adjustments } = await supabase
          .from("batch_adjustments")
          .select("*, staff:profiles!adjusted_by(nama), batch:item_batches!inner(nombor_kelompok)")
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
    let filtered = assignedPatients;
    // Search filter
    if (patientSearch) {
      filtered = filtered.filter((a: any) =>
        a.patient?.nama?.toLowerCase().includes(patientSearch.toLowerCase()) ||
        a.patient?.nombor_kad_pengenalan?.includes(patientSearch)
      );
    }
    // Defaulter filter
    if (defaulterFilter) {
      const now = new Date();
      const months = parseInt(defaulterFilter);
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
      filtered = filtered.filter((a: any) => {
        if (!a.last_supply) return true; // no supply = defaulter
        return new Date(a.last_supply) < cutoff;
      });
    }
    return filtered;
  }, [assignedPatients, patientSearch, defaulterFilter]);

  const sortedPatients = useMemo(() => {
    if (!patientSort) return filteredPatients;
    const key = patientSort.key;
    return [...filteredPatients].sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (key === "nama") { aVal = a.patient?.nama || ""; bVal = b.patient?.nama || ""; }
      else if (key === "nombor_kad_pengenalan") { aVal = a.patient?.nombor_kad_pengenalan || ""; bVal = b.patient?.nombor_kad_pengenalan || ""; }
      else if (key === "dos") { aVal = a.dos || ""; bVal = b.dos || ""; }
      else if (key === "last_supply") { aVal = a.last_supply || ""; bVal = b.last_supply || ""; }
      else { aVal = ""; bVal = ""; }
      const cmp = aVal.toString().toLowerCase().localeCompare(bVal.toString().toLowerCase(), "ms");
      return patientSort.dir === "asc" ? cmp : -cmp;
    });
  }, [filteredPatients, patientSort]);

  const pagedPatients = useMemo(() => sortedPatients.slice(patientPage * PAGE_SIZE, (patientPage + 1) * PAGE_SIZE), [sortedPatients, patientPage]);
  const patientTotalPages = Math.ceil((sortedPatients.length || 0) / PAGE_SIZE);

  const activeBatches = useMemo(() => sortedBatches.filter(b => b.kuantiti > 0), [sortedBatches]);
  const pagedBatches = useMemo(() => activeBatches.slice(batchPage * PAGE_SIZE, (batchPage + 1) * PAGE_SIZE), [activeBatches, batchPage]);
  const batchTotalPages = Math.ceil((activeBatches.length || 0) / PAGE_SIZE);

  const pagedTransactions = useMemo(() => filteredTransactions.slice(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE), [filteredTransactions, txPage]);
  const txTotalPages = Math.ceil((filteredTransactions.length || 0) / PAGE_SIZE);

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

  const updateItemMutation = useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      const { error } = await supabase.from("items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["item", id] }); queryClient.invalidateQueries({ queryKey: ["items"] }); },
    onError: (e: any) => toast.error(e.message || "Gagal mengemaskini item."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (batch: typeof newBatch) => {
      const kuantiti = parseInt(batch.kuantiti);
      const { data: existing } = await supabase
        .from("item_batches")
        .select("id, kuantiti")
        .eq("item_id", id)
        .eq("nombor_kelompok", batch.nombor_kelompok)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("item_batches")
          .update({ kuantiti: existing.kuantiti + kuantiti, tarikh_luput: batch.tarikh_luput })
          .eq("id", existing.id);
        if (error) throw error;
        const { error: adjError } = await supabase.from("batch_adjustments").insert({
          batch_id: existing.id, previous_kuantiti: existing.kuantiti, new_kuantiti: existing.kuantiti + kuantiti,
          change: kuantiti, reason: "Penambahan stok", adjusted_by: profile?.id,
        });
        if (adjError) throw adjError;
      } else {
        const { data, error } = await supabase.from("item_batches").insert({
          item_id: id, nombor_kelompok: batch.nombor_kelompok, tarikh_luput: batch.tarikh_luput, kuantiti,
        }).select().single();
        if (error) throw error;
        const { error: adjError } = await supabase.from("batch_adjustments").insert({
          batch_id: data.id, previous_kuantiti: 0, new_kuantiti: kuantiti, change: kuantiti,
          reason: "Stok awal kelompok baharu", adjusted_by: profile?.id,
        });
        if (adjError) throw adjError;
      }
    },
    onSuccess: () => {
      toast.success("Kelompok berjaya ditambah.");
      setOpenAddBatch(false);
      setNewBatch({ nombor_kelompok: "", tarikh_luput: "", kuantiti: "" });
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["transaction-history", id] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menambah kelompok."),
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, kuantiti, previousKuantiti }: { batchId: string; kuantiti: number; previousKuantiti: number }) => {
      const change = kuantiti - previousKuantiti;
      const { error: adjError } = await supabase.from("batch_adjustments").insert({
        batch_id: batchId, previous_kuantiti: previousKuantiti, new_kuantiti: kuantiti, change,
        reason: "Larasan stok manual", adjusted_by: profile?.id,
      });
      if (adjError) throw adjError;
      const { error } = await supabase.from("item_batches").update({ kuantiti }).eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kuantiti kelompok dikemaskini."); setEditBatchId(null); queryClient.invalidateQueries({ queryKey: ["batches", id] }); queryClient.invalidateQueries({ queryKey: ["transaction-history", id] }); },
    onError: (e: any) => toast.error(e.message || "Gagal mengemaskini kuantiti."),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { data: current } = await supabase.from("item_batches").select("kuantiti, nombor_kelompok").eq("id", batchId).single();
      if (!current) throw new Error("Kelompok tidak dijumpai.");
      const { error } = await supabase.from("item_batches").update({ kuantiti: 0 }).eq("id", batchId);
      if (error) throw error;
      const { error: adjError } = await supabase.from("batch_adjustments").insert({
        batch_id: batchId, previous_kuantiti: current.kuantiti, new_kuantiti: 0,
        change: -current.kuantiti, reason: "Pelupusan stok", adjusted_by: profile?.id,
      });
      if (adjError) throw adjError;
    },
    onSuccess: () => { toast.success("Stok dilupuskan."); queryClient.invalidateQueries({ queryKey: ["batches", id] }); queryClient.invalidateQueries({ queryKey: ["transaction-history", id] }); },
    onError: (e: any) => toast.error(e.message || "Gagal melupuskan stok."),
  });

  const exportToExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      wb.creator = "QuickRxRecord";
      wb.created = new Date();
      const title = `Transaksi Item: ${item?.nama_item || ""}`;
      const headers = ["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan", "Pesakit"];
      const keys = ["tarikh", "jenis", "kelompok", "perubahan", "keterangan", "kakitangan", "pesakit"];
      const ws = wb.addWorksheet("Transaksi Item");
      // Title row
      ws.mergeCells(1, 1, 1, headers.length);
      const titleCell = ws.getCell("A1");
      titleCell.value = title;
      titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1877F2" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 36;
      // Date row
      ws.mergeCells(2, 1, 2, headers.length);
      const dateCell = ws.getCell("A2");
      dateCell.value = `Dijana pada: ${new Date().toLocaleString("ms-MY")} | Jumlah: ${filteredTransactions.length} rekod`;
      dateCell.font = { size: 10, italic: true, color: { argb: "FF65676B" } };
      dateCell.alignment = { horizontal: "center" };
      ws.getRow(2).height = 22;
      // Header row
      const headerRow = ws.addRow(headers);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
      });
      // Data rows
      filteredTransactions.forEach((t: any, idx: number) => {
        const row = ws.addRow(keys.map(k => {
          const v = k === "tarikh" ? new Date(t[k]).toLocaleString("ms-MY") : k === "perubahan" ? (t[k] >= 0 ? `+${t[k]}` : String(t[k])) : String(t[k] ?? "");
          return v;
        }));
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { size: 10 };
          cell.alignment = { vertical: "middle" };
          cell.border = { bottom: { style: "thin", color: { argb: "FFF3F4F6" } } };
          if (idx % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
          // Color negative perubahan red, positive green
          if (Number(cell.col) === 4) {
            const val = String(cell.value || "");
            cell.font = { size: 10, bold: true, color: { argb: val.startsWith("-") ? "FFDC2626" : "FF16A34A" } };
          }
        });
      });
      // Auto column widths
      headers.forEach((h, i) => {
        const maxLen = Math.max(h.length, ...filteredTransactions.map((t: any) => {
          const k = keys[i];
          const v = k === "tarikh" ? new Date(t[k]).toLocaleString("ms-MY") : String(t[k] ?? "");
          return v.length;
        }));
        ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 12), 45);
      });
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
      const doc = new jsPDF("landscape");
      const title = `Transaksi Item: ${item?.nama_item || ""}`;
      // Header bar
      doc.setFillColor(24, 119, 242);
      doc.rect(0, 0, 300, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("QuickRxRecord", 14, 14);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(title, 14, 24);
      // Date & count
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Dijana pada: ${new Date().toLocaleString("ms-MY")}`, 14, 40);
      doc.text(`Jumlah rekod: ${filteredTransactions.length}`, 200, 40);
      // Table
      autoTable(doc, {
        head: [["Tarikh", "Jenis", "Kelompok", "Perubahan", "Keterangan", "Kakitangan", "Pesakit"]],
        body: filteredTransactions.map((t: any) => [
          new Date(t.tarikh).toLocaleString("ms-MY"), t.jenis, t.kelompok,
          t.perubahan >= 0 ? `+${t.perubahan}` : String(t.perubahan),
          t.keterangan, t.kakitangan, t.pesakit,
        ]),
        startY: 46,
        styles: { fontSize: 8, cellPadding: 3, lineColor: [229, 231, 235], lineWidth: 0.3 },
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
        columnStyles: { 3: { fontStyle: "bold" } },
        didParseCell(data) {
          if (data.section === "body" && data.column.index === 3) {
            const val = String(data.cell.raw || "");
            data.cell.styles.textColor = val.startsWith("-") ? [220, 38, 38] : [22, 163, 74];
          }
        },
      });
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`QuickRxRecord - ${title}`, 14, doc.internal.pageSize.height - 8);
        doc.text(`Halaman ${i} / ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
      }
      doc.save(`Transaksi_${item?.kod_item || "item"}.pdf`);
      toast.success("Fail PDF berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport PDF."); }
  };

  if (!item) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid rgba(124, 58, 237, 0.15)", borderTopColor: "#7c3aed", borderRadius: "50%", margin: "0 auto 12px", WebkitAnimation: "spin 1s linear infinite", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan...</p>
        <style>{`@-webkit-keyframes spin{from{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const totalStock = batches?.reduce((sum, b) => sum + b.kuantiti, 0) || 0;
  const totalPatients = assignedPatients?.length || 0;
  const bakiKuota = item?.kuota != null ? Math.max(0, item.kuota - totalPatients) : null;

  return (
    <div className="space-y-6" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124, 58, 237, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />
      <div className="flex items-center justify-between">
        <Breadcrumb items={[{ label: "Inventori", href: "/stok" }, { label: itemDisplayName || item.nama_item || "Butiran Item" }]} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button onClick={() => router.push("/stok")} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(124, 58, 237, 0.15)", background: "rgba(124, 58, 237, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0 }}>
          <ArrowLeft size={20} color="#7c3aed" />
        </button>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>{itemDisplayName}</h1>
      </div>

      {/* 1. Item Info */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.02 }}>
      <FoldableCard title={itemDisplayName} defaultOpen={true} headerExtra={canEdit && !editMode ? <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setEditMode(true); setEditData(item); }}><Edit className="mr-2 h-4 w-4" /> Edit</Button> : undefined}>
        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Kod Item</Label><Input value={editData.kod_item || ""} onChange={e => setEditData({ ...editData, kod_item: e.target.value })} onBlur={e => setEditData({ ...editData, kod_item: e.target.value.trim().toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Nama Item</Label><Input value={editData.nama_item || ""} onChange={e => setEditData({ ...editData, nama_item: e.target.value })} onBlur={e => setEditData({ ...editData, nama_item: toTitleCaseKeepAcronyms(e.target.value.trim()) })} /></div>
              <div className="space-y-2"><Label>Nama Dagangan</Label><Input value={editData.nama_dagangan || ""} onChange={e => setEditData({ ...editData, nama_dagangan: e.target.value })} onBlur={e => setEditData({ ...editData, nama_dagangan: toTitleCaseKeepAcronyms(e.target.value.trim()) })} /></div>
              <div className="space-y-2"><Label>Kekuatan</Label><Input value={editData.kekuatan || ""} onChange={e => setEditData({ ...editData, kekuatan: e.target.value })} onBlur={e => setEditData({ ...editData, kekuatan: e.target.value.trim().toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Kategori Item</Label>
                <Select value={editData.id_kategori || ""} onValueChange={v => setEditData({ ...editData, id_kategori: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bentuk Dos</Label>
                <Select value={editData.id_bentuk || ""} onValueChange={v => setEditData({ ...editData, id_bentuk: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih bentuk" /></SelectTrigger>
                  <SelectContent>
                    {forms?.map(f => <SelectItem key={f.id} value={f.id}>{f.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Jumlah Kuota</Label><Input type="number" value={editData.kuota ?? ""} onChange={e => setEditData({ ...editData, kuota: e.target.value ? parseInt(e.target.value) : null })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateItemMutation.mutate({ ...editData, kod_item: (editData.kod_item || "").trim().toUpperCase(), nama_item: toTitleCaseKeepAcronyms((editData.nama_item || "").trim()), nama_dagangan: editData.nama_dagangan != null ? toTitleCaseKeepAcronyms(editData.nama_dagangan.trim()) : undefined, kekuatan: editData.kekuatan != null ? editData.kekuatan.trim().toUpperCase() : undefined })} disabled={updateItemMutation.isPending}>Simpan</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div><span className="text-muted-foreground">Kod:</span> {item.kod_item}</div>
              <div><span className="text-muted-foreground">Nama Dagangan:</span> {item.nama_dagangan || "-"}</div>
              <div><span className="text-muted-foreground">Kekuatan:</span> {item.kekuatan || "-"}</div>
              <div><span className="text-muted-foreground">Kategori:</span> {currentCategoryName || "-"}</div>
              <div><span className="text-muted-foreground">Bentuk Dos:</span> {currentFormName || "-"}</div>
              <div><span className="text-muted-foreground">Catatan:</span> {item.catatan || "-"}</div>
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
      </motion.div>

      {/* 2. Pesakit Yang Menggunakan */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.01 }}>
      <FoldableCard title="Pesakit Yang Menggunakan" count={filteredPatients.length} defaultOpen={true}>
        {assignedPatients && assignedPatients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Cari pesakit..." className="pl-8 h-8 text-sm" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            </div>
            <Select value={defaulterFilter} onValueChange={setDefaulterFilter}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Semua Pesakit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pesakit</SelectItem>
                <SelectItem value="3">Tercicir 3 bulan</SelectItem>
                <SelectItem value="6">Tercicir 6 bulan</SelectItem>
                <SelectItem value="9">Tercicir 9 bulan</SelectItem>
                <SelectItem value="12">Tercicir 1 tahun</SelectItem>
                <SelectItem value="24">{`Tercicir > 1 tahun`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {sortedPatients.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Nama" sortKey="nama" currentSort={patientSort} onSort={k => { toggleSort(patientSort, setPatientSort, k); setPatientPage(0); }} />
                  <SortableHeader label="No. KP" sortKey="nombor_kad_pengenalan" currentSort={patientSort} onSort={k => { toggleSort(patientSort, setPatientSort, k); setPatientPage(0); }} />
                  <SortableHeader label="Dos" sortKey="dos" currentSort={patientSort} onSort={k => { toggleSort(patientSort, setPatientSort, k); setPatientPage(0); }} />
                  <SortableHeader label="Bekalan Terakhir" sortKey="last_supply" currentSort={patientSort} onSort={k => { toggleSort(patientSort, setPatientSort, k); setPatientPage(0); }} />
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPatients.map((a: any) => {
                  const lastDate = a.last_supply ? new Date(a.last_supply) : null;
                  const monthsSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / (30 * 24 * 60 * 60 * 1000)) : null;
                  const isDefaulter = monthsSince !== null && monthsSince >= 3;
                  return (
                    <TableRow key={a.patient?.id} className="cursor-pointer" onClick={() => { setNavSource("stok:" + itemDisplayName + ":" + item.id); router.push(`/pesakit/${a.patient?.id}`); }}>
                      <TableCell>{a.patient?.nama}</TableCell>
                      <TableCell>{a.patient?.nombor_kad_pengenalan || "-"}</TableCell>
                      <TableCell className="text-xs">{a.dos || "-"}</TableCell>
                      <TableCell className="text-xs">{lastDate ? formatDate(a.last_supply) : <Badge variant="destructive" className="text-[10px]">Tiada</Badge>}</TableCell>
                      <TableCell>{isDefaulter ? <Badge variant="destructive" className="text-[10px]">Tercicir {monthsSince} bln</Badge> : <Badge variant="success" className="text-[10px]">Aktif</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {patientTotalPages > 1 && (
              <div className="flex justify-center gap-1 pt-3">
                <Button size="sm" variant="outline" disabled={patientPage === 0} onClick={() => setPatientPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                {Array.from({ length: patientTotalPages }, (_, i) => (
                  <Button key={i} size="sm" variant={i === patientPage ? "default" : "outline"} onClick={() => setPatientPage(i)}>{i + 1}</Button>
                ))}
                <Button size="sm" variant="outline" disabled={patientPage >= patientTotalPages - 1} onClick={() => setPatientPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{patientSearch || defaulterFilter ? "Tiada pesakit sepadan." : "Tiada pesakit menggunakan item ini."}</p>
        )}
      </FoldableCard>
      </motion.div>

      {/* 3. Batches */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.08 }}>
      <FoldableCard title="Senarai Kelompok" count={activeBatches.length} defaultOpen={true} headerExtra={canManageBatches ? <Button size="sm" onClick={e => { e.stopPropagation(); setOpenAddBatch(true); }}><Plus className="mr-1 h-3.5 w-3.5" />Tambah Stok</Button> : undefined}>
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
            {activeBatches.length === 0 ? (
              <TableRow><TableCell colSpan={canManageBatches ? 5 : 4} className="text-center py-8 text-muted-foreground">Tiada kelompok.</TableCell></TableRow>
            ) : (
              pagedBatches.map(batch => {
                const isExpired = new Date(batch.tarikh_luput) < new Date();
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">{batch.nombor_kelompok}</TableCell>
                    <TableCell>{formatDate(batch.tarikh_luput)}</TableCell>
                    <TableCell>
                      {editBatchId === batch.id ? (
                        <div className="flex gap-1">
                          <Input type="number" className="w-24 h-7 text-sm" value={editBatchData.kuantiti} onChange={e => setEditBatchData({ kuantiti: e.target.value })} />
                          <Button size="sm" onClick={() => {
                            const newVal = parseInt(editBatchData.kuantiti);
                            if (newVal === batch.kuantiti) { toast.info("Tiada perubahan pada kuantiti."); return; }
                            setPendingBatchAction({ type: "adjust", batch, newKuantiti: newVal });
                          }}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditBatchId(null)}>✕</Button>
                        </div>
                      ) : batch.kuantiti}
                    </TableCell>
                    <TableCell><Badge variant={isExpired ? "destructive" : batch.kuantiti > 0 ? "success" : "secondary"}>{isExpired ? "Luput" : batch.kuantiti > 0 ? "Tersedia" : "Habis"}</Badge></TableCell>
                    {canManageBatches && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditBatchId(batch.id); setEditBatchData({ kuantiti: String(batch.kuantiti) }); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setPendingBatchAction({ type: "dispose", batch })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {batchTotalPages > 1 && (
          <div className="flex justify-center gap-1 pt-3">
            <Button size="sm" variant="outline" disabled={batchPage === 0} onClick={() => setBatchPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: batchTotalPages }, (_, i) => (
              <Button key={i} size="sm" variant={i === batchPage ? "default" : "outline"} onClick={() => setBatchPage(i)}>{i + 1}</Button>
            ))}
            <Button size="sm" variant="outline" disabled={batchPage >= batchTotalPages - 1} onClick={() => setBatchPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </FoldableCard>
      </motion.div>

      {/* Confirm Batch Action Dialog */}
      <Dialog open={!!pendingBatchAction} onOpenChange={(v) => { if (!v) setPendingBatchAction(null); }}>
        <DialogContent style={{ maxWidth: "460px", borderRadius: "16px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              {pendingBatchAction?.type === "dispose" ? <Trash2 size={18} className="text-destructive" /> : <Edit size={18} className="text-amber-500" />}
              {pendingBatchAction?.type === "dispose" ? "Pengesahan Pelupusan Stok" : "Pengesahan Pelarasan Stok"}
            </DialogTitle>
            <DialogDescription style={{ fontSize: "13px" }}>Sila semak maklumat di bawah sebelum meneruskan.</DialogDescription>
          </DialogHeader>
          {pendingBatchAction && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(24, 119, 242, 0.04)", border: "1px solid rgba(24, 119, 242, 0.1)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><span className="text-muted-foreground text-xs">Kelompok:</span><p className="font-semibold font-mono text-sm">{pendingBatchAction.batch.nombor_kelompok}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tarikh Luput:</span><p className="font-semibold text-sm">{formatDate(pendingBatchAction.batch.tarikh_luput)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Stok Semasa:</span><p className="font-semibold text-sm">{pendingBatchAction.batch.kuantiti} unit</p></div>
                  {pendingBatchAction.type === "adjust" && (
                    <div><span className="text-muted-foreground text-xs">Stok Baharu:</span><p className="font-semibold text-sm">{pendingBatchAction.newKuantiti} unit</p></div>
                  )}
                </div>
              </div>

              {pendingBatchAction.type === "dispose" && (
                <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                  <p className="text-xs font-semibold text-destructive" style={{ marginBottom: "4px" }}>⚠️ Kesan Pelupusan:</p>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#6b7280", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <li>Semua stok {pendingBatchAction.batch.kuantiti} unit akan dilupuskan (stok = 0).</li>
                    <li>Rekod pelupusan akan direkodkan dalam Sejarah Transaksi Item.</li>
                    <li>Tindakan ini boleh diterbalikkan dengan menambah stok semula.</li>
                  </ul>
                </div>
              )}

              {pendingBatchAction.type === "adjust" && (() => {
                const diff = pendingBatchAction.newKuantiti! - pendingBatchAction.batch.kuantiti;
                return (
                  <div style={{ padding: "12px", borderRadius: "10px", background: diff > 0 ? "rgba(34, 197, 94, 0.06)" : "rgba(239, 68, 68, 0.06)", border: `1px solid ${diff > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.15)"}` }}>
                    <p className="text-xs font-semibold" style={{ color: diff > 0 ? "#16a34a" : "#dc2626", marginBottom: "4px" }}>
                      ⚠️ Kesan Pelarasan ({diff > 0 ? `+${diff}` : diff} unit):
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#6b7280", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {diff > 0 ? (
                        <>
                          <li>Stok bertambah daripada {pendingBatchAction.batch.kuantiti} kepada {pendingBatchAction.newKuantiti} unit.</li>
                          <li>Rekod kemasukan stok ({diff} unit) akan direkodkan dalam Sejarah Transaksi Item.</li>
                        </>
                      ) : (
                        <>
                          <li>Stok berkurang daripada {pendingBatchAction.batch.kuantiti} kepada {pendingBatchAction.newKuantiti} unit.</li>
                          <li>Rekod pengeluaran stok ({Math.abs(diff)} unit) akan direkodkan dalam Sejarah Transaksi Item.</li>
                        </>
                      )}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter style={{ gap: "8px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setPendingBatchAction(null)}>Batal</Button>
            <Button variant={pendingBatchAction?.type === "dispose" ? "destructive" : "default"} disabled={updateBatchMutation.isPending || deleteBatchMutation.isPending} onClick={() => {
              if (!pendingBatchAction) return;
              if (pendingBatchAction.type === "dispose") {
                deleteBatchMutation.mutate(pendingBatchAction.batch.id);
              } else if (pendingBatchAction.type === "adjust") {
                updateBatchMutation.mutate({ batchId: pendingBatchAction.batch.id, kuantiti: pendingBatchAction.newKuantiti!, previousKuantiti: pendingBatchAction.batch.kuantiti });
              }
              setPendingBatchAction(null);
            }}>
              {(updateBatchMutation.isPending || deleteBatchMutation.isPending) ? "Memproses..." : "Saya Faham, Teruskan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Batch Dialog */}
      <Dialog open={openAddBatch} onOpenChange={setOpenAddBatch}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kelompok Baharu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombor Kelompok *</Label><Input value={newBatch.nombor_kelompok} onChange={e => setNewBatch({ ...newBatch, nombor_kelompok: e.target.value })} onBlur={e => setNewBatch({ ...newBatch, nombor_kelompok: e.target.value.trim().toUpperCase() })} /></div>
            <div className="space-y-2"><Label>Tarikh Luput *</Label><Input type="date" value={newBatch.tarikh_luput} onChange={e => setNewBatch({ ...newBatch, tarikh_luput: e.target.value })} /></div>
            <div className="space-y-2"><Label>Kuantiti *</Label><Input type="number" value={newBatch.kuantiti} onChange={e => setNewBatch({ ...newBatch, kuantiti: e.target.value })} onBlur={e => setNewBatch({ ...newBatch, kuantiti: e.target.value.trim() })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddBatch(false)}>Batal</Button>
            <Button onClick={() => addBatchMutation.mutate({ ...newBatch, nombor_kelompok: newBatch.nombor_kelompok.trim().toUpperCase(), kuantiti: newBatch.kuantiti.trim() })} disabled={!newBatch.nombor_kelompok?.trim() || !newBatch.tarikh_luput || !newBatch.kuantiti?.trim() || addBatchMutation.isPending}>
              {addBatchMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Transaction History */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.4 }}>
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
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { const klDate = getKLDate(); const kl = new Date(klDate); const start = `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, "0")}-01`; setFilterDateFrom(start); setFilterDateTo(klDate); setFilterPatient(""); setFilterStaff(""); }}>
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
                  {pagedTransactions.map((t: any) => (
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
          {txTotalPages > 1 && (
            <div className="flex justify-center gap-1 pt-3">
              <Button size="sm" variant="outline" disabled={txPage === 0} onClick={() => setTxPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: txTotalPages }, (_, i) => (
                <Button key={i} size="sm" variant={i === txPage ? "default" : "outline"} onClick={() => setTxPage(i)}>{i + 1}</Button>
              ))}
              <Button size="sm" variant="outline" disabled={txPage >= txTotalPages - 1} onClick={() => setTxPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </FoldableCard>
      </motion.div>
    </div>
  );
}