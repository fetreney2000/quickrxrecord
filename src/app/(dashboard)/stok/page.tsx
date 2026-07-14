"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Plus, Search, ChevronLeft, ChevronRight, Eye, Package } from "lucide-react";
import type { Item } from "@/types";

const PAGE_SIZE = 20;

export default function StokPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    kod_item: "", nama_item: "", nama_dagangan: "", kekuatan: "", kuota: "", catatan: "",
  });
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const canEdit = hasPermission(profile?.peranan, "manage_items");

  const { data, isLoading } = useQuery({
    queryKey: ["items", search, page],
    queryFn: async () => {
      let query = supabase
        .from("items")
        .select("*, item_batches(kuantiti)", { count: "exact" })
        .eq("aktif", true)
        .order("nama_item")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`nama_item.ilike.%${search}%,kod_item.ilike.%${search}%,nama_dagangan.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { items: data || [], total: count || 0 };
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { error } = await supabase.from("items").insert({
        kod_item: item.kod_item,
        nama_item: item.nama_item,
        nama_dagangan: item.nama_dagangan || null,
        kekuatan: item.kekuatan || null,
        kuota: item.kuota ? parseInt(item.kuota) : null,
        catatan: item.catatan || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item berjaya ditambah.");
      setOpenAdd(false);
      setNewItem({ kod_item: "", nama_item: "", nama_dagangan: "", kekuatan: "", kuota: "", catatan: "" });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => toast.error("Gagal menambah item."),
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Papan Pemuka", href: "/" },
        { label: "Stok & Item" },
      ]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengurusan Stok & Item</h1>
        {canEdit && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Tambah Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Item Baharu</DialogTitle>
                <DialogDescription>Isi maklumat item ubat di bawah.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Kod Item *</Label><Input value={newItem.kod_item} onChange={e => setNewItem({ ...newItem, kod_item: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Kekuatan</Label><Input value={newItem.kekuatan} onChange={e => setNewItem({ ...newItem, kekuatan: e.target.value })} placeholder="cth: 500mg" /></div>
                </div>
                <div className="space-y-2"><Label>Nama Item *</Label><Input value={newItem.nama_item} onChange={e => setNewItem({ ...newItem, nama_item: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nama Dagangan</Label><Input value={newItem.nama_dagangan} onChange={e => setNewItem({ ...newItem, nama_dagangan: e.target.value })} /></div>
                <div className="space-y-2"><Label>Kuota (bil. pesakit)</Label><Input type="number" value={newItem.kuota} onChange={e => setNewItem({ ...newItem, kuota: e.target.value })} /></div>
                <div className="space-y-2"><Label>Catatan</Label><Input value={newItem.catatan} onChange={e => setNewItem({ ...newItem, catatan: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
                <Button onClick={() => addItemMutation.mutate(newItem)} disabled={!newItem.kod_item || !newItem.nama_item || addItemMutation.isPending}>
                  {addItemMutation.isPending ? "Menyimpan..." : "Simpan"}
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
              <Input placeholder="Cari item..." className="pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <Badge variant="secondary">{data?.total || 0} item</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead>Kekuatan</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Jumlah Stok</TableHead>
                <TableHead className="w-[80px]">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuatkan...</TableCell></TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tiada item dijumpai.</TableCell></TableRow>
              ) : (
                (data?.items as any[])?.map((item: any) => {
                  const totalStock = item.item_batches?.reduce((sum: number, b: any) => sum + (b.kuantiti || 0), 0) || 0;
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/stok/${item.id}`)}>
                      <TableCell className="font-mono text-sm">{item.kod_item}</TableCell>
                      <TableCell className="font-medium">{item.nama_item} {item.nama_dagangan && `(${item.nama_dagangan})`}</TableCell>
                      <TableCell>{item.kekuatan || "-"}</TableCell>
                      <TableCell>{item.kuota ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={totalStock > 0 ? "success" : "destructive"}>
                          {totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); router.push(`/stok/${item.id}`); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Halaman {page + 1} daripada {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}