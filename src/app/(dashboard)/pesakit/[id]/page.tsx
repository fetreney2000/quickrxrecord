"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
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
import {
  ArrowLeft, Plus, Edit, XCircle, Package, Merge, Trash2,
  ChevronDown, ChevronUp, ClipboardList, Activity, Search,
  UserX, ShieldAlert, ChevronLeft, ChevronRight, User,
  Phone, MapPin, Calendar, FileText, Hash, Pill, Clock,
  AlertTriangle, CheckCircle, Syringe, History, Layers,
  Stethoscope, IdCard, Hospital, BookOpen, Save, Ban,
  ArrowUpDown, Filter, MoreHorizontal, Eye, EyeOff,
  RefreshCw, Printer, Download, Info, Sparkles,
} from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, ItemBatch, ItemForm } from "@/types";

type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: { key: string; dir: SortDir } | null; onSort: (key: string) => void }) {
  const isActive = currentSort?.key === sortKey;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (
          currentSort?.dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

// ─── Patient Info Row Component ───────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 border border-border/40 hover:bg-white hover:shadow-sm transition-all duration-200">
      <div className="icon-circle bg-primary/10 text-primary shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value || "-"}</p>
      </div>
    </div>
  );
}

// ─── Stat Badge Component ──────────────────────────────────────────────────
function StatBadge({ icon: Icon, label, value, color = "blue" }: { icon: any; label: string; value: string | number; color?: "blue" | "green" | "purple" | "orange" | "red" }) {
  const colorMap = {
    blue: "from-blue-500/10 to-blue-600/5 text-blue-700 border-blue-200/50 dark:from-blue-500/20 dark:to-blue-600/10 dark:text-blue-300 dark:border-blue-800/30",
    green: "from-emerald-500/10 to-emerald-600/5 text-emerald-700 border-emerald-200/50 dark:from-emerald-500/20 dark:to-emerald-600/10 dark:text-emerald-300 dark:border-emerald-800/30",
    purple: "from-purple-500/10 to-purple-600/5 text-purple-700 border-purple-200/50 dark:from-purple-500/20 dark:to-purple-600/10 dark:text-purple-300 dark:border-purple-800/30",
    orange: "from-amber-500/10 to-amber-600/5 text-amber-700 border-amber-200/50 dark:from-amber-500/20 dark:to-amber-600/10 dark:text-amber-300 dark:border-amber-800/30",
    red: "from-red-500/10 to-red-600/5 text-red-700 border-red-200/50 dark:from-red-500/20 dark:to-red-600/10 dark:text-red-300 dark:border-red-800/30",
  };
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} border`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

// ─── Section Header Component ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, children }: { icon: any; title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="icon-circle bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {count !== undefined && (
            <p className="text-[11px] text-muted-foreground">{count} rekod</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────
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
  const [openDeactivate, setOpenDeactivate] = useState(false);
  const [assignmentSort, setAssignmentSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [doseSort, setDoseSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [supplySort, setSupplySort] = useState<{ key: string; dir: SortDir } | null>(null);
  const itemSearchRef = useRef<HTMLInputElement>(null);

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Patient;
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patient_item_assignments").select("*, item:items(*)").eq("patient_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as (PatientItemAssignment & { item: Item })[];
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

  const formsMap = useMemo(() => {
    const map = new Map<string, string>();
    forms?.forEach(f => map.set(f.id, f.nama));
    return map;
  }, [forms]);

  const { data: items } = useQuery({
    queryKey: ["items-with-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, id_bentuk, kuota, catatan").eq("aktif", true).order("nama_item");
      if (error) throw error;
      const itemsList = data as any[];
      const { data: counts } = await supabase.from("patient_item_assignments").select("item_id").eq("aktif", true);
      const itemCountMap: Record<string, number> = {};
      for (const c of (counts || [])) itemCountMap[c.item_id] = (itemCountMap[c.item_id] || 0) + 1;
      return itemsList.map(item => ({ ...item, patient_count: itemCountMap[item.id] || 0, baki_kuota: item.kuota != null ? Math.max(0, item.kuota - (itemCountMap[item.id] || 0)) : null }));
    },
  });

  const getItemDisplayName = useCallback((item: any) => {
    if (!item) return "";
    const bentukDos = formsMap.get(item.id_bentuk) || "";
    return [item.nama_item, item.kekuatan, bentukDos].filter(Boolean).join(" ");
  }, [formsMap]);

  const { data: doseHistory } = useQuery({
    queryKey: ["dose-history", expandedAssignment],
    queryFn: async () => {
      if (!expandedAssignment) return [];
      const { data: doseData, error } = await supabase.from("dose_history").select("*").eq("assignment_id", expandedAssignment).order("tarikh", { ascending: false });
      if (!error && doseData) {
        const staffIds = [...new Set(doseData.map(d => d.dikemaskini_oleh).filter(Boolean))];
        let staffMap: Record<string, any> = {};
        if (staffIds.length > 0) {
          const { data: staff } = await supabase.from("profiles").select("id, nama").in("id", staffIds);
          for (const s of (staff || [])) staffMap[s.id] = s;
        }
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

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ aktif }: { aktif: boolean }) => {
      const { error } = await supabase.from("patients").update({ aktif }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(patient?.aktif ? "Pesakit dinyahaktifkan." : "Pesakit diaktifkan semula.");
      setOpenDeactivate(false);
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
    },
    onError: () => toast.error("Gagal mengemaskini status pesakit."),
  });

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
      toast.success("Item berjaya ditambah.");
      setOpenAddAssignment(false);
      setSelectedItemId(null);
      setItemSearch("");
      setNewAssignment({ item_id: "", dos: "", tarikh_mula_guna: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
      queryClient.invalidateQueries({ queryKey: ["items-with-stats"] });
    },
    onError: () => toast.error("Gagal menambah item."),
  });

  const stopAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, sebab }: { assignmentId: string; sebab: string }) => {
      const { error } = await supabase.from("patient_item_assignments").update({
        tarikh_tamat_guna: new Date().toISOString().split("T")[0],
        ditamatkan_oleh: profile?.id,
        sebab_tamat: sebab,
        aktif: false,
      }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item ditamatkan.");
      setOpenStopAssign(null);
      setStopReason("");
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
      queryClient.invalidateQueries({ queryKey: ["items-with-stats"] });
    },
    onError: () => toast.error("Gagal menamatkan item."),
  });

  const updateDoseMutation = useMutation({
    mutationFn: async ({ assignmentId, dos, catatan }: { assignmentId: string; dos: string; catatan?: string }) => {
      const { error: updateError } = await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId);
      if (updateError) throw updateError;
      const { error: historyError } = await supabase.from("dose_history").insert({
        assignment_id: assignmentId,
        tarikh: new Date().toISOString().split("T")[0],
        dos,
        aktif: true,
        catatan: catatan || null,
        dikemaskini_oleh: profile?.id,
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

  const { data: availableBatches } = useQuery({
    queryKey: ["batches-for-supply", openSupply],
    queryFn: async () => {
      if (!openSupply) return [];
      const assignment = assignments?.find(a => a.id === openSupply);
      if (!assignment) return [];
      const { data, error } = await supabase.from("item_batches").select("*")
        .eq("item_id", assignment.item_id)
        .gt("kuantiti", 0)
        .gte("tarikh_luput", new Date().toISOString().split("T")[0])
        .order("tarikh_luput", { ascending: true });
      if (error) throw error;
      return data as ItemBatch[];
    },
    enabled: !!openSupply,
  });

  const supplyMutation = useMutation({
    mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => {
      const parsedKuantiti = parseInt(data.kuantiti, 10);
      if (!data.kuantiti || isNaN(parsedKuantiti) || parsedKuantiti <= 0) {
        throw new Error("Kuantiti mesti lebih daripada 0.");
      }
      if (data.batch_id) {
        const batch = availableBatches?.find(b => b.id === data.batch_id);
        if (!batch) throw new Error("Kelompok tidak dijumpai.");
        if (batch.kuantiti < parsedKuantiti) {
          throw new Error(`Stok tidak mencukupi. Stok semasa: ${batch.kuantiti}, diperlukan: ${parsedKuantiti}`);
        }
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
          batch_id: data.batch_id || null,
          kakitangan_pembekal: profile?.id,
          catatan_bekalan: data.catatan_bekalan || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal merekod bekalan.");
      return result;
    },
    onSuccess: () => {
      toast.success("Bekalan berjaya direkodkan.");
      setOpenSupply(null);
      setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" });
      queryClient.invalidateQueries({ queryKey: ["assignments", id] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal merekod bekalan."),
  });

  const deleteSupplyMutation = useMutation({
    mutationFn: async (supplyId: string) => {
      const { error } = await supabase.from("supply_records").delete().eq("id", supplyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rekod bekalan dipadam.");
      setOpenDeleteSupply(null);
      queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] });
    },
    onError: () => toast.error("Gagal memadam rekod bekalan."),
  });

  const saveEditSupplyMutation = useMutation({
    mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: any }) => {
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
      setEditSupplyRecord(null);
      queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] });
    },
    onError: () => toast.error("Gagal mengemaskini rekod bekalan."),
  });

  // Sorting & pagination helpers
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

  const sortedAssignments = useMemo(() => sortData(assignments || [], assignmentSort), [assignments, assignmentSort]);
  const pagedAssignments = useMemo(() => sortedAssignments.slice(assignmentPage * PAGE_SIZE, (assignmentPage + 1) * PAGE_SIZE), [sortedAssignments, assignmentPage]);
  const totalAssignmentPages = Math.ceil((sortedAssignments.length || 0) / PAGE_SIZE);

  const sortedDoseHistory = useMemo(() => sortData(doseHistory || [], doseSort), [doseHistory, doseSort]);
  const sortedSupplyHistory = useMemo(() => sortData(supplyHistory || [], supplySort), [supplyHistory, supplySort]);

  // Loading state
  if (patientLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuatkan data pesakit...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="icon-circle bg-destructive/10 text-destructive mx-auto w-14 h-14 rounded-2xl">
            <UserX className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold">Pesakit tidak dijumpai</p>
          <Button variant="outline" onClick={() => router.push("/pesakit")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </div>
      </div>
    );
  }

  const currentAssignment = openSupply ? assignments?.find(a => a.id === openSupply) : null;

  const toggleExpand = (assignmentId: string) => {
    if (expandedAssignment !== assignmentId) {
      setFoldDose(true);
      setFoldSupply(true);
    }
    setExpandedAssignment(expandedAssignment === assignmentId ? null : assignmentId);
    setEditSupplyRecord(null);
  };

  const filteredItems = (items || []).filter((item: any) =>
    !itemSearch ||
    item.nama_item.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.kod_item?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // Assignment counts
  const activeCount = assignments?.filter(a => a.aktif).length || 0;
  const totalCount = assignments?.length || 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Breadcrumb ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Breadcrumb
          items={[
            { label: "Papan Pemuka", href: "/" },
            { label: "Pesakit", href: "/pesakit" },
            { label: patient.nama || "Butiran Pesakit" },
          ]}
        />
      </motion.div>

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/pesakit")}
          className="shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Butiran Pesakit</h1>
        </div>
      </motion.div>

      {/* ─── Patient Profile Card ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="premium-card overflow-hidden border-0 shadow-lg shadow-primary/5">
          {/* Gradient header bar */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-purple-500" />

          <CardHeader className="premium-card-header flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="icon-circle bg-gradient-to-br from-primary to-primary/70 text-white w-14 h-14 rounded-2xl shadow-lg shadow-primary/20">
                <User className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <CardTitle className="text-xl font-bold">{patient.nama}</CardTitle>
                  {!patient.aktif && (
                    <Badge variant="destructive" className="premium-badge gap-1.5">
                      <Ban className="h-3 w-3" /> Tidak Aktif
                    </Badge>
                  )}
                  {patient.aktif && (
                    <Badge variant="success" className="premium-badge gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
                      <CheckCircle className="h-3 w-3" /> Aktif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <IdCard className="h-3 w-3 inline mr-1" />
                  ID: {patient.id?.slice(0, 8)}... | Daftar: {formatDate(patient.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenMerge(true)}
                  className="rounded-xl border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Merge className="mr-1.5 h-3.5 w-3.5 text-primary" /> Gabung
                </Button>
              )}
              {canEdit && !editMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditMode(true); setEditData(patient); }}
                    className="rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant={patient.aktif ? "destructive" : "default"}
                    size="sm"
                    onClick={() => setOpenDeactivate(true)}
                    className="rounded-xl"
                  >
                    <UserX className="mr-1.5 h-3.5 w-3.5" />
                    {patient.aktif ? "Nyahaktif" : "Aktifkan"}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {editMode ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <User className="h-3 w-3 inline mr-1" /> Nama
                    </Label>
                    <Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <IdCard className="h-3 w-3 inline mr-1" /> No. KP
                    </Label>
                    <Input value={editData.nombor_kad_pengenalan || ""} onChange={e => setEditData({ ...editData, nombor_kad_pengenalan: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Hospital className="h-3 w-3 inline mr-1" /> No. Pendaftaran Hospital
                    </Label>
                    <Input value={editData.nombor_pendaftaran_hospital || ""} onChange={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Phone className="h-3 w-3 inline mr-1" /> No. Telefon
                    </Label>
                    <Input value={editData.nombor_telefon || ""} onChange={e => setEditData({ ...editData, nombor_telefon: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" /> Alamat
                  </Label>
                  <Textarea value={editData.alamat || ""} onChange={e => setEditData({ ...editData, alamat: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3 w-3 inline mr-1" /> Catatan
                  </Label>
                  <Textarea value={editData.catatan || ""} onChange={e => setEditData({ ...editData, catatan: e.target.value })} className="rounded-xl" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => updatePatientMutation.mutate(editData)} className="rounded-xl shadow-lg shadow-primary/20">
                    <Save className="mr-1.5 h-4 w-4" /> Simpan
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-xl">
                    Batal
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                <InfoRow icon={IdCard} label="No. KP" value={patient.nombor_kad_pengenalan || "-"} />
                <InfoRow icon={Hospital} label="No. Pendaftaran Hospital" value={patient.nombor_pendaftaran_hospital || "-"} />
                <InfoRow icon={Phone} label="No. Telefon" value={patient.nombor_telefon || "-"} />
                <InfoRow icon={Calendar} label="Tarikh Daftar" value={formatDate(patient.created_at)} />
                <InfoRow icon={MapPin} label="Alamat" value={patient.alamat || "-"} className="xl:col-span-2" />
                {patient.catatan && (
                  <InfoRow icon={FileText} label="Catatan" value={patient.catatan} className="xl:col-span-2" />
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Deactivate/Activate Dialog ───────────────────────────────── */}
      <Dialog open={openDeactivate} onOpenChange={setOpenDeactivate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> {patient.aktif ? "Nyahaktifkan Pesakit" : "Aktifkan Pesakit"}
            </DialogTitle>
            <DialogDescription>
              {patient.aktif
                ? "Anda akan menyahaktifkan pesakit ini. Tindakan ini akan menjejaskan data berikut:"
                : "Anda akan mengaktifkan semula pesakit ini."}
            </DialogDescription>
          </DialogHeader>
          {patient.aktif ? (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-destructive mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Amaran Penting
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs">
                  <li>Pesakit akan ditandakan sebagai <strong>Tidak Aktif</strong></li>
                  <li>Pesakit tidak akan muncul dalam carian atau senarai pesakit aktif</li>
                  <li>Semua penugasan item yang aktif masih boleh diakses</li>
                  <li>Sejarah dos dan bekalan sebelum ini akan kekal disimpan</li>
                  <li>Pesakit boleh diaktifkan semula bila-bila masa</li>
                </ul>
              </div>
              <div className="rounded-xl border p-3 text-sm bg-muted/30">
                <p className="font-medium">{patient.nama}</p>
                <p className="text-xs text-muted-foreground mt-1">No. KP: {patient.nombor_kad_pengenalan || "-"}</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Pengaktifan Semula
              </p>
              <ul className="list-disc list-inside space-y-1 text-emerald-600 dark:text-emerald-400 text-xs">
                <li>Pesakit akan kelihatan semula dalam carian dan senarai</li>
                <li>Semua data dan penugasan sebelumnya kekal tidak berubah</li>
              </ul>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDeactivate(false)} className="rounded-xl">Batal</Button>
            <Button
              variant={patient.aktif ? "destructive" : "default"}
              onClick={() => toggleActiveMutation.mutate({ aktif: !patient.aktif })}
              disabled={toggleActiveMutation.isPending}
              className="rounded-xl"
            >
              {toggleActiveMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memproses...</span>
              ) : (
                patient.aktif ? "Ya, Nyahaktifkan" : "Ya, Aktifkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Item Assignments Section ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="premium-card overflow-hidden border-0 shadow-lg shadow-primary/5">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 via-primary to-blue-500" />
          <CardHeader className="premium-card-header flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="icon-circle bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                <Pill className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Item Didaftarkan</h3>
                <p className="text-[11px] text-muted-foreground">{totalCount} rekod</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {patient.aktif && canEdit && (
                <Dialog
                  open={openAddAssignment}
                  onOpenChange={(v) => { setOpenAddAssignment(v); if (!v) { setSelectedItemId(null); setItemSearch(""); } }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
                      <Plus className="mr-1.5 h-4 w-4" /> Tambah Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" /> Tambah Item Baharu
                      </DialogTitle>
                      <DialogDescription>Cari dan pilih item dari senarai di bawah.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cari Item Ubat</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            ref={itemSearchRef}
                            className="pl-9 rounded-xl"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Cari nama atau kod item..."
                          />
                        </div>
                      </div>
                      <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                            <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Kuota</TableHead>
                              <TableHead>Guna</TableHead>
                              <TableHead>Baki</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  <Search className="h-5 w-5 mx-auto mb-2 opacity-40" />
                                  Tiada item dijumpai.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredItems.map((item: any) => (
                                <TableRow
                                  key={item.id}
                                  className={`cursor-pointer transition-colors ${selectedItemId === item.id ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"}`}
                                  onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                                >
                                  <TableCell>
                                    <input
                                      type="radio"
                                      name="item_select"
                                      checked={selectedItemId === item.id}
                                      onChange={() => setSelectedItemId(item.id)}
                                      className="accent-primary"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium text-sm">{item.nama_item} {item.kekuatan}</div>
                                    <div className="text-xs text-muted-foreground">{item.kod_item}</div>
                                  </TableCell>
                                  <TableCell className="text-sm">{item.kuota ?? "-"}</TableCell>
                                  <TableCell className="text-sm">
                                    <Badge variant="secondary" className="text-[10px]">{item.patient_count}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {item.baki_kuota != null ? (
                                      <Badge variant={item.baki_kuota > 0 ? "success" : "destructive"} className="text-[10px]">
                                        {item.baki_kuota}
                                      </Badge>
                                    ) : "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {selectedItemId && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-primary/5 border border-primary/10 rounded-xl"
                        >
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            Dipilih: <span className="text-primary">{items?.find((i: any) => i.id === selectedItemId)?.nama_item}</span>
                          </p>
                        </motion.div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dos</Label>
                        <Input
                          value={newAssignment.dos}
                          onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })}
                          placeholder="cth: 1 biji 2x sehari"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarikh Mula</Label>
                        <Input
                          type="date"
                          value={newAssignment.tarikh_mula_guna}
                          onChange={e => setNewAssignment({ ...newAssignment, tarikh_mula_guna: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => { setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); }} className="rounded-xl">Batal</Button>
                      <Button
                        onClick={() => { if (selectedItemId) addAssignmentMutation.mutate({ ...newAssignment, item_id: selectedItemId }); }}
                        disabled={!selectedItemId || !newAssignment.dos || addAssignmentMutation.isPending}
                        className="rounded-xl"
                      >
                        {addAssignmentMutation.isPending ? (
                          <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
                        ) : "Simpan"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {assignmentsLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Memuatkan item...</p>
              </div>
            ) : assignments?.length === 0 ? (
              <div className="p-12 text-center">
                <div className="icon-circle bg-muted text-muted-foreground mx-auto w-14 h-14 rounded-2xl mb-3">
                  <Pill className="h-6 w-6" />
                </div>
                <p className="text-muted-foreground font-medium">Tiada item didaftarkan.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Klik "Tambah Item" untuk mendaftarkan item baru.</p>
              </div>
            ) : (
              <>
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-12 gap-3 items-center px-6 py-3 border-b bg-gradient-to-r from-muted/80 to-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div
                    className="col-span-5 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort(assignmentSort, setAssignmentSort, "item.nama_item")}
                  >
                    Item {assignmentSort?.key === "item.nama_item" ? (
                      assignmentSort.dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
                    ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                  <div
                    className="col-span-2 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort(assignmentSort, setAssignmentSort, "dos")}
                  >
                    Dos {assignmentSort?.key === "dos" ? (
                      assignmentSort.dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
                    ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                  <div
                    className="col-span-2 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort(assignmentSort, setAssignmentSort, "tarikh_mula_guna")}
                  >
                    Mula {assignmentSort?.key === "tarikh_mula_guna" ? (
                      assignmentSort.dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
                    ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Assignment Items */}
                <AnimatePresence>
                  {pagedAssignments?.map((assignment, idx) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02, duration: 0.2 }}
                    >
                      <div className="border-b last:border-b-0 hover:bg-accent/20 transition-colors">
                        <button className="w-full text-left" onClick={() => toggleExpand(assignment.id)}>
                          {/* Desktop Row */}
                          <div className="hidden sm:flex items-center gap-3 px-6 py-4">
                            <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-5">
                                <div className="flex items-center gap-3">
                                  <div className="icon-circle bg-gradient-to-br from-primary/10 to-primary/5 text-primary w-9 h-9 rounded-xl shrink-0">
                                    <Pill className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{getItemDisplayName(assignment.item)}</div>
                                    <div className="text-[11px] text-muted-foreground">{assignment.item?.kod_item}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-2 text-sm font-medium">{assignment.dos || <span className="text-muted-foreground italic">-</span>}</div>
                              <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" /> {formatDate(assignment.tarikh_mula_guna)}
                              </div>
                              <div className="col-span-2">
                                <Badge
                                  variant={assignment.aktif ? "success" : "secondary"}
                                  className={`text-[10px] px-2.5 py-0.5 ${
                                    assignment.aktif
                                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0"
                                      : ""
                                  }`}
                                >
                                  {assignment.aktif ? (
                                    <span className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" /> Aktif</span>
                                  ) : "Tamat"}
                                </Badge>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <motion.div
                                  animate={{ rotate: expandedAssignment === assignment.id ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Row */}
                          <div className="sm:hidden px-5 py-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="icon-circle bg-primary/10 text-primary w-8 h-8 rounded-xl shrink-0">
                                  <Pill className="h-3.5 w-3.5" />
                                </div>
                                <div className="font-medium text-sm truncate">{getItemDisplayName(assignment.item)}</div>
                              </div>
                              <motion.div
                                animate={{ rotate: expandedAssignment === assignment.id ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              </motion.div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pl-10">
                              <span className="flex items-center gap-1"><Pill className="h-3 w-3" /> {assignment.dos || "-"}</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(assignment.tarikh_mula_guna)}</span>
                              <Badge
                                variant={assignment.aktif ? "success" : "secondary"}
                                className={`text-[10px] ${assignment.aktif ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0" : ""}`}
                              >
                                {assignment.aktif ? "Aktif" : "Tamat"}
                              </Badge>
                            </div>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {expandedAssignment === assignment.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 pt-3 bg-gradient-to-b from-accent/15 to-transparent border-t border-border/50 space-y-5">
                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                  {assignment.aktif && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setOpenUpdateDose(assignment.id); setDoseUpdate({ dos: assignment.dos || "", catatan: "" }); }}
                                        className="rounded-xl border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-all"
                                      >
                                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Kemaskini Dos
                                      </Button>
                                      {canSupply && (
                                        <Button
                                          size="sm"
                                          onClick={() => { setOpenSupply(assignment.id); setSupplyData({ tempoh_nilai: "", tempoh_unit: "Hari", kuantiti: "", batch_id: "", catatan_bekalan: "" }); }}
                                          className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20"
                                        >
                                          <Package className="mr-1.5 h-3.5 w-3.5" /> Bekal Item
                                        </Button>
                                      )}
                                      {canEdit && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => { setOpenStopAssign(assignment.id); setStopReason(""); }}
                                          className="rounded-xl"
                                        >
                                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Tamatkan
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Dose History */}
                                <div>
                                  <button
                                    className="text-sm font-semibold flex items-center gap-2 w-full text-left hover:text-primary transition-colors group"
                                    onClick={() => setFoldDose(!foldDose)}
                                  >
                                    <div className={`icon-circle bg-gradient-to-br from-blue-500/15 to-blue-500/5 text-blue-600 w-7 h-7 rounded-lg transition-transform duration-200 ${!foldDose ? "rotate-0" : ""}`}>
                                      {foldDose ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Activity className="h-4 w-4 text-blue-600" />
                                      Sejarah Dos
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                      {doseHistory?.length || 0}
                                    </Badge>
                                  </button>
                                  {!foldDose && (
                                    <div className="mt-3">
                                      {sortedDoseHistory && sortedDoseHistory.length > 0 ? (
                                        <div className="border rounded-xl overflow-hidden bg-white/50 dark:bg-black/10 shadow-sm">
                                          <Table>
                                            <TableHeader className="bg-muted/50">
                                              <TableRow>
                                                <SortableHeader label="Tarikh" sortKey="tarikh" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                                <SortableHeader label="Dos" sortKey="dos" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} />
                                                <TableHead>Dikemaskini Oleh</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {sortedDoseHistory.map((d: any) => (
                                                <TableRow key={d.id} className="hover:bg-accent/30 transition-colors">
                                                  <TableCell className="font-medium">{formatDate(d.tarikh)}</TableCell>
                                                  <TableCell>{d.dos}</TableCell>
                                                  <TableCell className="text-muted-foreground">{d.staff_name || "-"}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-3 bg-muted/20 rounded-xl">
                                          <Info className="h-4 w-4" /> Tiada sejarah dos.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Supply History */}
                                <div>
                                  <button
                                    className="text-sm font-semibold flex items-center gap-2 w-full text-left hover:text-primary transition-colors group"
                                    onClick={() => setFoldSupply(!foldSupply)}
                                  >
                                    <div className={`icon-circle bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-600 w-7 h-7 rounded-lg transition-transform duration-200 ${!foldSupply ? "rotate-0" : ""}`}>
                                      {foldSupply ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ClipboardList className="h-4 w-4 text-emerald-600" />
                                      Sejarah Bekalan
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                      {supplyHistory?.length || 0}
                                    </Badge>
                                  </button>
                                  {!foldSupply && (
                                    <div className="mt-3">
                                      {sortedSupplyHistory && sortedSupplyHistory.length > 0 ? (
                                        <div className="border rounded-xl overflow-hidden bg-white/50 dark:bg-black/10 shadow-sm">
                                          <Table>
                                            <TableHeader className="bg-muted/50">
                                              <TableRow>
                                                <SortableHeader label="Tarikh" sortKey="tarikh_dibekal" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                                <SortableHeader label="Dos" sortKey="dos" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                                <TableHead>Tempoh</TableHead>
                                                <SortableHeader label="Kuantiti" sortKey="kuantiti" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} />
                                                <TableHead>Kelompok</TableHead>
                                                <TableHead>Kakitangan</TableHead>
                                                <TableHead className="w-[100px]">Tindakan</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {sortedSupplyHistory.map((record: any) => (
                                                <TableRow key={record.id} className="hover:bg-accent/30 transition-colors">
                                                  <TableCell className="font-medium">{formatDate(record.tarikh_dibekal)}</TableCell>
                                                  <TableCell>{record.dos}</TableCell>
                                                  <TableCell>{record.tempoh_dibekal || "-"}</TableCell>
                                                  <TableCell>
                                                    <Badge variant="secondary" className="text-[10px]">{record.kuantiti}</Badge>
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground">{record.batch?.nombor_kelompok || "-"}</TableCell>
                                                  <TableCell className="text-muted-foreground">{record.staff?.nama || "-"}</TableCell>
                                                  <TableCell>
                                                    <div className="flex gap-1">
                                                      <Button size="sm" variant="ghost" onClick={() => setEditSupplyRecord(record)} className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                                                        <Edit className="h-3.5 w-3.5" />
                                                      </Button>
                                                      <Button size="sm" variant="ghost" onClick={() => setOpenDeleteSupply(record)} className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                      </Button>
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-3 bg-muted/20 rounded-xl">
                                          <Info className="h-4 w-4" /> Tiada sejarah bekalan.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Pagination */}
                {totalAssignmentPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Menunjukkan {assignmentPage * PAGE_SIZE + 1} - {Math.min((assignmentPage + 1) * PAGE_SIZE, sortedAssignments.length)} daripada {sortedAssignments.length}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentPage(Math.max(0, assignmentPage - 1))}
                        disabled={assignmentPage === 0}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {Array.from({ length: totalAssignmentPages }, (_, i) => (
                        <Button
                          key={i}
                          variant={i === assignmentPage ? "default" : "outline"}
                          size="sm"
                          className="h-8 min-w-[32px] px-2 text-xs rounded-lg font-semibold"
                          onClick={() => setAssignmentPage(i)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentPage(Math.min(totalAssignmentPages - 1, assignmentPage + 1))}
                        disabled={assignmentPage >= totalAssignmentPages - 1}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Dialogs ──────────────────────────────────────────────────── */}

      {/* Stop Assignment Dialog */}
      <Dialog open={!!openStopAssign} onOpenChange={() => setOpenStopAssign(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Tamatkan Item
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan menamatkan item ini untuk pesakit ini. Sejarah dos dan bekalan akan tetap disimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm">
              <p className="font-medium text-destructive mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Amaran Penting
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                <li>Item ini akan ditamatkan serta-merta</li>
                <li>Tiada bekalan lanjut boleh dilakukan</li>
                <li>Catatan tarikh tamat dan siapa yang menamatkan akan direkodkan</li>
                <li>Sejarah dos dan bekalan sebelum ini tidak akan dipadam</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sebab Tamat *</Label>
              <Select value={stopReason} onValueChange={setStopReason}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih sebab tamat" /></SelectTrigger>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenStopAssign(null)} className="rounded-xl">Batal</Button>
            <Button
              variant="destructive"
              onClick={() => { if (openStopAssign && stopReason) stopAssignmentMutation.mutate({ assignmentId: openStopAssign, sebab: stopReason }); }}
              disabled={!stopReason || stopAssignmentMutation.isPending}
              className="rounded-xl"
            >
              {stopAssignmentMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menamatkan...</span>
              ) : "Ya, Tamatkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Supply Dialog */}
      <Dialog open={!!openDeleteSupply} onOpenChange={() => setOpenDeleteSupply(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Padam Rekod Bekalan
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan memadamkan rekod bekalan secara kekal dan tidak boleh dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {openDeleteSupply && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm space-y-2">
                <p className="font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Amaran Penting
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>Rekod bekalan ini akan dipadamkan secara kekal</li>
                  <li>Data tidak boleh dipulihkan semula</li>
                  <li>Kuantiti stok tidak akan dikembalikan secara automatik</li>
                  <li>Sejarah dos dan penugasan pesakit tidak terjejas</li>
                </ul>
              </div>
              <div className="rounded-xl border text-sm bg-muted/20">
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Tarikh</span>
                    <span className="font-medium">{formatDate(openDeleteSupply.tarikh_dibekal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Dos</span>
                    <span className="font-medium">{openDeleteSupply.dos}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Kuantiti</span>
                    <span className="font-medium">{openDeleteSupply.kuantiti}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Tempoh</span>
                    <span className="font-medium">{openDeleteSupply.tempoh_dibekal || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDeleteSupply(null)} className="rounded-xl">Batal</Button>
            <Button
              variant="destructive"
              onClick={() => { if (openDeleteSupply) { deleteSupplyMutation.mutate(openDeleteSupply.id); } }}
              disabled={deleteSupplyMutation.isPending}
              className="rounded-xl"
            >
              {deleteSupplyMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memadam...</span>
              ) : "Ya, Padamkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supply Dialog */}
      <Dialog open={!!editSupplyRecord} onOpenChange={() => setEditSupplyRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Rekod Bekalan
            </DialogTitle>
          </DialogHeader>
          {editSupplyRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dos</Label>
                <Input value={editSupplyRecord.editDos ?? editSupplyRecord.dos} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editDos: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempoh Bekalan</Label>
                <Input value={editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editTempoh: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kuantiti</Label>
                <Input type="number" value={editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
                <Textarea value={(editSupplyRecord.editCatatan ?? editSupplyRecord.catatan_bekalan) || ""} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editCatatan: e.target.value })} className="rounded-xl" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditSupplyRecord(null)} className="rounded-xl">Batal</Button>
            <Button
              onClick={() => {
                if (editSupplyRecord) {
                  saveEditSupplyMutation.mutate({
                    supplyId: editSupplyRecord.id,
                    updates: {
                      dos: editSupplyRecord.editDos ?? editSupplyRecord.dos,
                      tempoh_dibekal: editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal,
                      kuantiti: editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti,
                      catatan_bekalan: editSupplyRecord.editCatatan ?? editSupplyRecord.catatan_bekalan,
                    },
                  });
                }
              }}
              disabled={saveEditSupplyMutation.isPending}
              className="rounded-xl"
            >
              {saveEditSupplyMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
              ) : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dose Dialog */}
      <Dialog open={!!openUpdateDose} onOpenChange={() => setOpenUpdateDose(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Kemaskini Dos
            </DialogTitle>
            <DialogDescription>Kemaskini dos untuk penugasan ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dos Baru</Label>
              <Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
              <Textarea value={doseUpdate.catatan} onChange={e => setDoseUpdate({ ...doseUpdate, catatan: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenUpdateDose(null)} className="rounded-xl">Batal</Button>
            <Button
              onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos, catatan: doseUpdate.catatan }); }}
              disabled={!doseUpdate.dos || updateDoseMutation.isPending}
              className="rounded-xl"
            >
              {updateDoseMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
              ) : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supply Item Dialog */}
      <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Bekal Ubat
            </DialogTitle>
            <DialogDescription>Rekodkan bekalan ubat untuk pesakit ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dos Semasa</Label>
              <Input value={currentAssignment?.dos || "-"} readOnly className="rounded-xl bg-muted/50" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Guna <strong>Kemaskini Dos</strong> untuk menukar dos.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelompok (Batch)</Label>
              {!supplyData.batch_id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3" /> Auto FEFO: kelompok terdekat luput akan dipilih automatik
                </p>
              )}
              <Select value={supplyData.batch_id} onValueChange={v => setSupplyData({ ...supplyData, batch_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih kelompok (pilihan)" /></SelectTrigger>
                <SelectContent>
                  {availableBatches?.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.nombor_kelompok} — Stok: {batch.kuantiti} — Luput: {formatDate(batch.tarikh_luput)}
                    </SelectItem>
                  ))}
                  {availableBatches?.length === 0 && (
                    <SelectItem value="none" disabled>Tiada kelompok tersedia</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempoh Bekalan</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="w-24 rounded-xl"
                  value={supplyData.tempoh_nilai}
                  onChange={e => setSupplyData({ ...supplyData, tempoh_nilai: e.target.value })}
                  placeholder="Nilai"
                />
                <Select value={supplyData.tempoh_unit} onValueChange={v => setSupplyData({ ...supplyData, tempoh_unit: v })}>
                  <SelectTrigger className="w-28 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hari">Hari</SelectItem>
                    <SelectItem value="Minggu">Minggu</SelectItem>
                    <SelectItem value="Bulan">Bulan</SelectItem>
                  </SelectContent>
                </Select>
                {supplyData.tempoh_nilai && (
                  <div className="flex items-center text-sm font-medium text-muted-foreground bg-muted/50 px-3 rounded-xl border">
                    {supplyData.tempoh_nilai} {supplyData.tempoh_unit}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kuantiti</Label>
              <Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
              <Textarea value={supplyData.catatan_bekalan} onChange={e => setSupplyData({ ...supplyData, catatan_bekalan: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenSupply(null)} className="rounded-xl">Batal</Button>
            <Button
              onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply, dos: currentAssignment.dos || "" }); }}
              disabled={!supplyData.kuantiti || supplyMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20"
            >
              {supplyMutation.isPending ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
              ) : (
                <span className="flex items-center gap-1.5"><Package className="h-4 w-4" /> Bekal</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}
    </div>
  );
}