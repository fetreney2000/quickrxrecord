"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import {
  Plus, Search, ChevronLeft, ChevronRight, Eye,
  ChevronDown, ChevronUp, ArrowUpDown, User,
  IdCard, Phone, RefreshCw, Users, Activity,
  ArrowRight, Sparkles, AlertCircle, Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";

type SortDir = "asc" | "desc";

const PAGE_SIZE = 100;

export default function PesakitPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [newPatient, setNewPatient] = useState({
    nama: "",
    nombor_kad_pengenalan: "",
    nombor_pendaftaran_hospital: "",
    nombor_telefon: "",
    alamat: "",
    catatan: "",
  });
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const canEdit = hasPermission(profile?.peranan, "manage_patients");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page, sort],
    queryFn: async () => {
      const sortKey = sort?.key || "nama";
      const sortDir = sort?.dir || "asc";

      const countQuery = supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("aktif", true)
        .is("merged_into", null);

      let dataQuery = supabase
        .from("patients")
        .select("*")
        .eq("aktif", true)
        .is("merged_into", null)
        .order(sortKey, { ascending: sortDir === "asc" })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        const filter = `nama.ilike.%${search}%,nombor_kad_pengenalan.ilike.%${search}%,nombor_pendaftaran_hospital.ilike.%${search}%`;
        countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      const [{ count }, { data, error }] = await Promise.all([
        countQuery,
        dataQuery,
      ]);
      if (error) throw error;
      return { patients: (data as Patient[]) || [], total: count || 0 };
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: async (patient: typeof newPatient) => {
      const { error } = await supabase.from("patients").insert({
        ...patient,
        nombor_kad_pengenalan: patient.nombor_kad_pengenalan || null,
        nombor_pendaftaran_hospital: patient.nombor_pendaftaran_hospital || null,
        nombor_telefon: patient.nombor_telefon || null,
        alamat: patient.alamat || null,
        catatan: patient.catatan || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pesakit berjaya ditambah.");
      setOpenAdd(false);
      setNewPatient({ nama: "", nombor_kad_pengenalan: "", nombor_pendaftaran_hospital: "", nombor_telefon: "", alamat: "", catatan: "" });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => {
      toast.error("Gagal menambah pesakit.");
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const toggleSort = useCallback((key: string) => {
    if (sort?.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, dir: "asc" });
    }
    setPage(0);
  }, [sort]);

  const SortIcon = useCallback(({ columnKey }: { columnKey: string }) => {
    if (sort?.key !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sort.dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
  }, [sort]);

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Breadcrumb ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Breadcrumb items={[
          { label: "Papan Pemuka", href: "/" },
          { label: "Senarai Pesakit" },
        ]} />
      </motion.div>

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="icon-circle bg-gradient-to-br from-primary to-primary/70 text-white w-12 h-12 rounded-2xl shadow-lg shadow-primary/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Senarai Pesakit</h1>
            <p className="text-sm text-muted-foreground">
              Urus dan cari rekod pesakit
            </p>
          </div>
        </div>
        {canEdit && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pesakit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Tambah Pesakit Baharu
                </DialogTitle>
                <DialogDescription>Isi maklumat pesakit di bawah.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="h-3 w-3 inline mr-1" /> Nama *
                  </Label>
                  <Input value={newPatient.nama} onChange={(e) => setNewPatient({ ...newPatient, nama: e.target.value })} className="rounded-xl" placeholder="Nama penuh pesakit" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <IdCard className="h-3 w-3 inline mr-1" /> No. Kad Pengenalan
                    </Label>
                    <Input value={newPatient.nombor_kad_pengenalan} onChange={(e) => setNewPatient({ ...newPatient, nombor_kad_pengenalan: e.target.value })} className="rounded-xl" placeholder="000101-01-0001" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Activity className="h-3 w-3 inline mr-1" /> No. Pendaftaran Hospital
                    </Label>
                    <Input value={newPatient.nombor_pendaftaran_hospital} onChange={(e) => setNewPatient({ ...newPatient, nombor_pendaftaran_hospital: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Phone className="h-3 w-3 inline mr-1" /> No. Telefon
                  </Label>
                  <Input value={newPatient.nombor_telefon} onChange={(e) => setNewPatient({ ...newPatient, nombor_telefon: e.target.value })} className="rounded-xl" placeholder="012-3456789" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alamat</Label>
                  <Textarea value={newPatient.alamat} onChange={(e) => setNewPatient({ ...newPatient, alamat: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
                  <Textarea value={newPatient.catatan} onChange={(e) => setNewPatient({ ...newPatient, catatan: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpenAdd(false)} className="rounded-xl">Batal</Button>
                <Button
                  onClick={() => addPatientMutation.mutate(newPatient)}
                  disabled={!newPatient.nama || addPatientMutation.isPending}
                  className="rounded-xl"
                >
                  {addPatientMutation.isPending ? (
                    <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
                  ) : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* ─── Main Card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="premium-card overflow-hidden border-0 shadow-lg shadow-primary/5">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-purple-500" />

          <CardHeader className="premium-card-header">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 rounded-xl"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Cari nama, No. KP, No. Hospital..."
                />
              </div>
              <Badge
                variant="secondary"
                className="rounded-lg px-3 py-1.5 text-xs gap-1.5 whitespace-nowrap"
              >
                <Users className="h-3 w-3" />
                {data?.total || 0} pesakit
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Memuatkan pesakit...</p>
              </div>
            ) : data?.patients.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center">
                <div className="icon-circle bg-muted text-muted-foreground mx-auto w-14 h-14 rounded-2xl mb-3">
                  {search ? <Search className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                </div>
                <p className="text-muted-foreground font-medium">
                  {search ? "Tiada pesakit dijumpai." : "Tiada pesakit berdaftar."}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {search
                    ? "Cuba tukar kata kunci carian anda."
                    : "Klik \"Tambah Pesakit\" untuk mendaftarkan pesakit baru."}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header - Desktop */}
                <div className="hidden sm:grid grid-cols-12 gap-3 items-center px-6 py-3 border-b bg-gradient-to-r from-muted/80 to-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div
                    className="col-span-3 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort("nama")}
                  >
                    <User className="h-3 w-3" /> Nama <SortIcon columnKey="nama" />
                  </div>
                  <div
                    className="col-span-3 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort("nombor_kad_pengenalan")}
                  >
                    <IdCard className="h-3 w-3" /> No. KP <SortIcon columnKey="nombor_kad_pengenalan" />
                  </div>
                  <div
                    className="col-span-3 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort("nombor_pendaftaran_hospital")}
                  >
                    <Activity className="h-3 w-3" /> No. Hospital <SortIcon columnKey="nombor_pendaftaran_hospital" />
                  </div>
                  <div
                    className="col-span-2 cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => toggleSort("nombor_telefon")}
                  >
                    <Phone className="h-3 w-3" /> No. Telefon <SortIcon columnKey="nombor_telefon" />
                  </div>
                  <div className="col-span-1 text-center">Tindakan</div>
                </div>

                {/* Patient Rows */}
                <AnimatedPatientRows
                  patients={data?.patients || []}
                  onView={(id) => router.push(`/pesakit/${id}`)}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Halaman {page + 1} daripada {totalPages}
                      <span className="hidden sm:inline"> ({data?.total || 0} pesakit)</span>
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Button
                          key={i}
                          variant={i === page ? "default" : "outline"}
                          size="sm"
                          className="h-8 min-w-[32px] px-2 text-xs rounded-lg font-semibold"
                          onClick={() => setPage(i)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
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
    </div>
  );
}

// ─── Animated Patient Rows ─────────────────────────────────────────────────
function AnimatedPatientRows({ patients, onView }: { patients: Patient[]; onView: (id: string) => void }) {
  return (
    <>
      {patients.map((patient, idx) => (
        <motion.div
          key={patient.id}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.015, duration: 0.2 }}
        >
          {/* Desktop Row */}
          <div
            className="hidden sm:grid grid-cols-12 gap-3 items-center px-6 py-4 border-b last:border-b-0 cursor-pointer hover:bg-accent/20 transition-colors group"
            onClick={() => onView(patient.id)}
          >
            <div className="col-span-3 flex items-center gap-3">
              <div className="icon-circle bg-gradient-to-br from-primary/10 to-primary/5 text-primary w-9 h-9 rounded-xl shrink-0 group-hover:shadow-md group-hover:shadow-primary/10 transition-all">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{patient.nama}</div>
                <div className="text-[11px] text-muted-foreground">ID: {patient.id?.slice(0, 8)}...</div>
              </div>
            </div>
            <div className="col-span-3 text-sm">{patient.nombor_kad_pengenalan || <span className="text-muted-foreground italic">-</span>}</div>
            <div className="col-span-3 text-sm">{patient.nombor_pendaftaran_hospital || <span className="text-muted-foreground italic">-</span>}</div>
            <div className="col-span-2 text-sm">{patient.nombor_telefon || <span className="text-muted-foreground italic">-</span>}</div>
            <div className="col-span-1 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onView(patient.id); }}
                className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Row */}
          <div
            className="sm:hidden px-5 py-3 border-b last:border-b-0 cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => onView(patient.id)}
          >
            <div className="flex items-center gap-3">
              <div className="icon-circle bg-primary/10 text-primary w-9 h-9 rounded-xl shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{patient.nama}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  {patient.nombor_kad_pengenalan && (
                    <span className="flex items-center gap-1"><IdCard className="h-3 w-3" /> {patient.nombor_kad_pengenalan}</span>
                  )}
                  {patient.nombor_telefon && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.nombor_telefon}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
}