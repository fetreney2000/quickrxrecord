"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Plus, Search, ChevronLeft, ChevronRight, Eye, ChevronDown, ChevronUp } from "lucide-react";
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

  const toggleSort = (key: string) => {
    if (sort?.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, dir: "asc" });
    }
    setPage(0);
  };

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sort?.key !== columnKey) return <div className="h-3 w-3 opacity-0" />;
    return sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Papan Pemuka", href: "/" },
        { label: "Senarai Pesakit" },
      ]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Senarai Pesakit</h1>
        {canEdit && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pesakit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Pesakit Baharu</DialogTitle>
                <DialogDescription>Isi maklumat pesakit di bawah.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Input value={newPatient.nama} onChange={(e) => setNewPatient({ ...newPatient, nama: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>No. Kad Pengenalan</Label>
                    <Input value={newPatient.nombor_kad_pengenalan} onChange={(e) => setNewPatient({ ...newPatient, nombor_kad_pengenalan: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Pendaftaran Hospital</Label>
                    <Input value={newPatient.nombor_pendaftaran_hospital} onChange={(e) => setNewPatient({ ...newPatient, nombor_pendaftaran_hospital: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>No. Telefon</Label>
                  <Input value={newPatient.nombor_telefon} onChange={(e) => setNewPatient({ ...newPatient, nombor_telefon: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Textarea value={newPatient.alamat} onChange={(e) => setNewPatient({ ...newPatient, alamat: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Textarea value={newPatient.catatan} onChange={(e) => setNewPatient({ ...newPatient, catatan: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
                <Button onClick={() => addPatientMutation.mutate(newPatient)} disabled={!newPatient.nama || addPatientMutation.isPending}>
                  {addPatientMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Badge variant="secondary">{data?.total || 0} pesakit</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => toggleSort("nama")}>
                  <div className="flex items-center gap-1">
                    Nama <SortIcon columnKey="nama" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => toggleSort("nombor_kad_pengenalan")}>
                  <div className="flex items-center gap-1">
                    No. KP <SortIcon columnKey="nombor_kad_pengenalan" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => toggleSort("nombor_pendaftaran_hospital")}>
                  <div className="flex items-center gap-1">
                    No. Pendaftaran Hospital <SortIcon columnKey="nombor_pendaftaran_hospital" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => toggleSort("nombor_telefon")}>
                  <div className="flex items-center gap-1">
                    No. Telefon <SortIcon columnKey="nombor_telefon" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Memuatkan...</TableCell>
                </TableRow>
              ) : data?.patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tiada pesakit dijumpai.
                  </TableCell>
                </TableRow>
              ) : (
                data?.patients.map((patient) => (
                  <TableRow key={patient.id} className="cursor-pointer" onClick={() => router.push(`/pesakit/${patient.id}`)}>
                    <TableCell className="font-medium">{patient.nama}</TableCell>
                    <TableCell>{patient.nombor_kad_pengenalan || "-"}</TableCell>
                    <TableCell>{patient.nombor_pendaftaran_hospital || "-"}</TableCell>
                    <TableCell>{patient.nombor_telefon || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/pesakit/${patient.id}`); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {page + 1} daripada {totalPages} ({data?.total || 0} pesakit)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}