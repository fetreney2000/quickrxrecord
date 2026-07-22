"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Merge, AlertTriangle } from "lucide-react";
import type { Patient } from "@/types";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryPatient: Patient;
}

export function MergeDialog({ open, onOpenChange, primaryPatient }: MergeDialogProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Patient[]>([]);
  const [step, setStep] = useState<"search" | "confirm">("search");
  const supabase = createClient();
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (search.length < 2) return;
    const { data } = await supabase
      .from("patients")
      .select("*")
      .or(`nama.ilike.%${search}%,nombor_kad_pengenalan.ilike.%${search}%,nombor_pendaftaran_hospital.ilike.%${search}%`)
      .eq("aktif", true)
      .is("merged_into", null)
      .neq("id", primaryPatient.id)
      .limit(20);
    setSearchResults((data as Patient[]) || []);
  };

  const toggleDuplicate = (patient: Patient) => {
    setSelectedDuplicates(prev => {
      const exists = prev.find(p => p.id === patient.id);
      if (exists) return prev.filter(p => p.id !== patient.id);
      return [...prev, patient];
    });
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const secondaryIds = selectedDuplicates.map(p => p.id);
      
      for (const secId of secondaryIds) {
        const { data: secAssignments } = await supabase
          .from("patient_item_assignments")
          .select("id, item_id")
          .eq("patient_id", secId)
          .eq("aktif", true);
        
        const { data: primaryAssignments } = await supabase
          .from("patient_item_assignments")
          .select("item_id")
          .eq("patient_id", primaryPatient.id)
          .eq("aktif", true);
        
        const primaryItemIds = new Set((primaryAssignments || []).map(a => a.item_id));
        
        for (const secAss of (secAssignments || [])) {
          if (primaryItemIds.has(secAss.item_id)) {
            const { error } = await supabase
              .from("patient_item_assignments")
              .update({ 
                aktif: false, 
                tarikh_tamat_guna: new Date().toISOString().split("T")[0],
                sebab_tamat: "Digabung - item pendua" 
              })
              .eq("id", secAss.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("patient_item_assignments")
              .update({ patient_id: primaryPatient.id })
              .eq("id", secAss.id);
            if (error) throw error;
          }
        }
        
        const { error } = await supabase
          .from("patients")
          .update({ merged_into: primaryPatient.id, aktif: false })
          .eq("id", secId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Berjaya menggabungkan ${selectedDuplicates.length} pesakit.`);
      onOpenChange(false);
      setSelectedDuplicates([]);
      setStep("search");
      setSearch("");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", primaryPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["assignments", primaryPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["items-with-stats"] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menggabungkan pesakit."),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStep("search"); setSelectedDuplicates([]); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Gabung Pesakit
          </DialogTitle>
          <DialogDescription>
            Gabungkan rekod pesakit pendua ke dalam <strong>{primaryPatient.nama}</strong>. 
            Semua item dan rekod bekalan akan dipindahkan ke pesakit utama.
          </DialogDescription>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4 flex flex-col max-h-[60vh]">
            <div className="flex gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>Cari</Button>
            </div>

            {selectedDuplicates.length > 0 && (
              <div className="p-3 bg-muted rounded-md flex-shrink-0">
                <p className="text-sm font-medium mb-2">Pesakit dipilih untuk digabungkan:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDuplicates.map(p => (
                    <Badge key={p.id} variant="secondary" className="cursor-pointer" onClick={() => toggleDuplicate(p)}>
                      {p.nama} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. KP</TableHead>
                    <TableHead>No. Pendaftaran Hospital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Cari pesakit pendua.</TableCell></TableRow>
                  ) : (
                    searchResults.map(patient => (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer"
                        onClick={() => toggleDuplicate(patient)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedDuplicates.some(p => p.id === patient.id)}
                            onChange={() => toggleDuplicate(patient)}
                          />
                        </TableCell>
                        <TableCell>{patient.nama}</TableCell>
                        <TableCell>{patient.nombor_kad_pengenalan || "-"}</TableCell>
                        <TableCell>{patient.nombor_pendaftaran_hospital || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedDuplicates.length > 0 && (
              <div className="flex justify-end flex-shrink-0">
                <Button onClick={() => setStep("confirm")}>
                  Teruskan ({selectedDuplicates.length} dipilih)
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Pengesahan Diperlukan</p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Tindakan ini tidak boleh dibatalkan. Semua item dan rekod bekalan dari pesakit pendua 
                  akan dipindahkan kepada <strong>{primaryPatient.nama}</strong>.
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pesakit Pendua</TableHead>
                  <TableHead>No. KP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDuplicates.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell>{p.nombor_kad_pengenalan || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("search")}>Kembali</Button>
              <Button variant="destructive" onClick={() => mergeMutation.mutate()} disabled={mergeMutation.isPending}>
                {mergeMutation.isPending ? "Menggabungkan..." : "Gabungkan Sekarang"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}