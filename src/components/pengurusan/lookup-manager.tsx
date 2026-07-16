"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Pill, CalendarDays } from "lucide-react";
import type { ItemCategory, ItemForm, SupplyDuration } from "@/types";

type LookupType = "item_categories" | "item_forms" | "supply_durations";

interface LookupConfig {
  table: LookupType;
  title: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const LOOKUP_CONFIGS: Record<LookupType, LookupConfig> = {
  item_categories: {
    table: "item_categories",
    title: "Kategori Item",
    label: "Kategori",
    icon: <Package className="h-4 w-4" />,
    description: "Urus kategori untuk item/ubat (contoh: Kategori A, Psikiatrik, KPK Item)",
  },
  item_forms: {
    table: "item_forms",
    title: "Bentuk Dos",
    label: "Bentuk Dos",
    icon: <Pill className="h-4 w-4" />,
    description: "Urus bentuk dos untuk item/ubat (contoh: Tablet, Kapsul, Sirap)",
  },
  supply_durations: {
    table: "supply_durations",
    title: "Durasi Bekalan",
    label: "Durasi",
    icon: <CalendarDays className="h-4 w-4" />,
    description: "Urus tempoh durasi bekalan (contoh: Hari, Minggu, Bulan)",
  },
};

interface LookupManagerProps {
  type: LookupType;
}

export function LookupManager({ type }: LookupManagerProps) {
  const config = LOOKUP_CONFIGS[type];
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: [type],
    queryFn: async () => {
      const { data, error } = await supabase.from(type).select("*").order("nama");
      if (error) throw error;
      return data as (ItemCategory | ItemForm | SupplyDuration)[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (nama: string) => {
      const { error } = await supabase.from(type).insert({ nama });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${config.label} berjaya ditambah.`);
      setOpenAdd(false);
      setNewName("");
      queryClient.invalidateQueries({ queryKey: [type] });
    },
    onError: (e: any) => toast.error(e.message || `Gagal menambah ${config.label.toLowerCase()}.`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nama }: { id: string; nama: string }) => {
      const { error } = await supabase.from(type).update({ nama }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${config.label} berjaya dikemaskini.`);
      setEditId(null);
      setEditName("");
      queryClient.invalidateQueries({ queryKey: [type] });
    },
    onError: (e: any) => toast.error(e.message || `Gagal mengemaskini ${config.label.toLowerCase()}.`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(type).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${config.label} berjaya dipadam.`);
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: [type] });
    },
    onError: (e: any) => toast.error(e.message || `Gagal memadam ${config.label.toLowerCase()}.`),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Tambah {config.label}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah {config.label} Baharu</DialogTitle>
              <DialogDescription>Masukkan nama {config.label.toLowerCase()} untuk ditambah ke dalam senarai.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama {config.label} *</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={`Masukkan nama ${config.label.toLowerCase()}`}
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) addMutation.mutate(newName.trim()); }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
              <Button onClick={() => addMutation.mutate(newName.trim())} disabled={!newName.trim() || addMutation.isPending}>
                {addMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Memuatkan...</div>
        ) : records?.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">Tiada {config.label.toLowerCase()} didaftarkan.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Nama {config.label}</TableHead>
                <TableHead className="w-[120px] text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.map((record, idx) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                  <TableCell>
                    {editId === record.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 max-w-xs"
                          onKeyDown={e => {
                            if (e.key === "Enter" && editName.trim()) {
                              updateMutation.mutate({ id: record.id, nama: editName.trim() });
                            }
                            if (e.key === "Escape") {
                              setEditId(null);
                              setEditName("");
                            }
                          }}
                          autoFocus
                        />
                        <Button size="sm" variant="default" onClick={() => updateMutation.mutate({ id: record.id, nama: editName.trim() })} disabled={!editName.trim() || updateMutation.isPending}>
                          {updateMutation.isPending ? "..." : "Simpan"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditName(""); }}>Batal</Button>
                      </div>
                    ) : (
                      <span className="font-medium">{(record as any).nama}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editId !== record.id && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditId(record.id); setEditName((record as any).nama); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ id: record.id, name: (record as any).nama })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Padam {config.label}
            </DialogTitle>
            <DialogDescription>
              Anda pasti mahu memadam <strong>{deleteConfirm?.name}</strong>?
              Tindakan ini tidak boleh dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm">
            <p className="font-semibold text-destructive">Amaran</p>
            <ul className="list-disc list-inside space-y-1 text-destructive/80 text-xs mt-1">
              <li>Item/ubat yang menggunakan {config.label.toLowerCase()} ini mungkin terjejas</li>
              <li>Data akan dipadam secara kekal</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Memadam..." : "Ya, Padam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}