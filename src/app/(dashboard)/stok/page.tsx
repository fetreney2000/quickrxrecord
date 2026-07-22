"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import {
  Plus, Search, ChevronLeft, ChevronRight, Eye, Package,
  ChevronDown, ChevronUp, ArrowUpDown, Hash, Pill, Activity,
  BarChart3, Boxes, Box, AlertTriangle, RefreshCw, Filter, Layers,
} from "lucide-react";
import type { Item, ItemForm, ItemCategory } from "@/types";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

export default function StokPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [newItem, setNewItem] = useState({
    kod_item: "", nama_item: "", nama_dagangan: "", kekuatan: "", id_kategori: "", id_bentuk: "", kuota: "", catatan: "",
  });
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const canEdit = hasPermission(profile?.peranan, "manage_items");

  const { data, isLoading } = useQuery({
    queryKey: ["items", search, page, sort],
    queryFn: async () => {
      const sortKey = sort?.key || "nama_item";
      const sortDir = sort?.dir || "asc";
      const countQuery = supabase.from("items").select("*", { count: "exact", head: true }).eq("aktif", true);
      let dataQuery = supabase.from("items").select("*, item_batches(kuantiti)").eq("aktif", true).order(sortKey, { ascending: sortDir === "asc" }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) {
        const filter = `nama_item.ilike.%${search}%,kod_item.ilike.%${search}%,nama_dagangan.ilike.%${search}%`;
        countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }
      const [{ count }, { data: items, error }] = await Promise.all([countQuery, dataQuery]);
      if (error) throw error;
      return { items: items || [], total: count || 0 };
    },
  });

  const { data: forms } = useQuery({
    queryKey: ["item_forms"],
    queryFn: async () => { const { data } = await supabase.from("item_forms").select("id, nama"); return (data || []) as Pick<ItemForm, "id" | "nama">[]; },
    staleTime: 60000,
  });
  const { data: categories } = useQuery({
    queryKey: ["item_categories"],
    queryFn: async () => { const { data } = await supabase.from("item_categories").select("id, nama"); return (data || []) as Pick<ItemCategory, "id" | "nama">[]; },
    staleTime: 60000,
  });
  const formsMap = useMemo(() => { const map = new Map<string, string>(); forms?.forEach(f => map.set(f.id, f.nama)); return map; }, [forms]);

  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { data: inserted, error } = await supabase.from("items").insert({
        kod_item: item.kod_item, nama_item: item.nama_item, nama_dagangan: item.nama_dagangan || null,
        kekuatan: item.kekuatan || null, id_kategori: item.id_kategori || null, id_bentuk: item.id_bentuk || null,
        kuota: item.kuota ? parseInt(item.kuota) : null, catatan: item.catatan || null,
      }).select("id").single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (inserted) => {
      toast.success("Item berjaya ditambah.");
      setOpenAdd(false);
      setNewItem({ kod_item: "", nama_item: "", nama_dagangan: "", kekuatan: "", id_kategori: "", id_bentuk: "", kuota: "", catatan: "" });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      router.push(`/stok/${inserted.id}`);
    },
    onError: () => toast.error("Gagal menambah item."),
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const toggleSort = (key: string) => { if (sort?.key === key) { setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" }); } else { setSort({ key, dir: "asc" }); } setPage(0); };

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sort?.key !== columnKey) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sort.dir === "asc" ? <ChevronUp size={12} color="#1877f2" /> : <ChevronDown size={12} color="#1877f2" />;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "40px", padding: "0 14px", borderRadius: "10px",
    border: "1.5px solid rgba(24, 119, 242, 0.12)", background: "rgba(24, 119, 242, 0.03)",
    fontSize: "13px", fontWeight: 500, color: "#1c1e21", fontFamily: "inherit", outline: "none",
    transition: "all 0.2s ease", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(24, 119, 242, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: "20px" }}>
        <Breadcrumb items={[{ label: "Inventori" }]} />
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)", flexShrink: 0 }}>
            <Pill size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>Pengurusan Inventori</h1>
            <p style={{ fontSize: "13px", color: "#65676b", fontWeight: 500 }}>Urus Inventori</p>
          </div>
        </div>
        {canEdit && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#ffffff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)", transition: "all 0.2s ease" }}>
                <Plus size={16} /> Tambah Item
              </button>
            </DialogTrigger>
            <DialogContent style={{ maxWidth: "560px", borderRadius: "16px", border: "1px solid rgba(124, 58, 237, 0.1)", boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
              <DialogHeader>
                <DialogTitle style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Pill size={18} color="#7c3aed" /> Tambah Item Baharu
                </DialogTitle>
                <DialogDescription style={{ fontSize: "13px" }}>Isi maklumat item ubat di bawah.</DialogDescription>
              </DialogHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Hash size={12} /> Kod Item *</Label>
                    <Input value={newItem.kod_item} onChange={e => setNewItem({ ...newItem, kod_item: e.target.value })} style={inputStyle} placeholder="KOD-001" />
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Activity size={12} /> Kekuatan</Label>
                    <Input value={newItem.kekuatan} onChange={e => setNewItem({ ...newItem, kekuatan: e.target.value })} style={inputStyle} placeholder="cth: 500mg" />
                  </div>
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Pill size={12} /> Nama Item *</Label>
                  <Input value={newItem.nama_item} onChange={e => setNewItem({ ...newItem, nama_item: e.target.value })} style={inputStyle} placeholder="Nama item ubat" />
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px" }}>Nama Dagangan</Label>
                  <Input value={newItem.nama_dagangan} onChange={e => setNewItem({ ...newItem, nama_dagangan: e.target.value })} style={inputStyle} placeholder="Nama dagangan (pilihan)" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Layers size={12} /> Kategori</Label>
                    <Select value={newItem.id_kategori} onValueChange={v => setNewItem({ ...newItem, id_kategori: v })}>
                      <SelectTrigger style={{ borderRadius: "10px", height: "40px" }}><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Box size={12} /> Bentuk Dos</Label>
                    <Select value={newItem.id_bentuk} onValueChange={v => setNewItem({ ...newItem, id_bentuk: v })}>
                      <SelectTrigger style={{ borderRadius: "10px", height: "40px" }}><SelectValue placeholder="Pilih bentuk" /></SelectTrigger>
                      <SelectContent>{forms?.map(f => <SelectItem key={f.id} value={f.id}>{f.nama}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><BarChart3 size={12} /> Kuota (bil. pesakit)</Label>
                  <Input type="number" value={newItem.kuota} onChange={e => setNewItem({ ...newItem, kuota: e.target.value })} style={inputStyle} placeholder="0" />
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px" }}>Catatan</Label>
                  <Textarea value={newItem.catatan} onChange={e => setNewItem({ ...newItem, catatan: e.target.value })} style={{ ...inputStyle, height: "72px", padding: "10px 14px", resize: "vertical" as const }} />
                </div>
              </div>
              <DialogFooter style={{ gap: "8px", marginTop: "8px" }}>
                <button onClick={() => setOpenAdd(false)} style={{ padding: "8px 16px", borderRadius: "10px", border: "1.5px solid #dddfe2", background: "#ffffff", color: "#1c1e21", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Batal</button>
                <button onClick={() => addItemMutation.mutate(newItem)} disabled={!newItem.kod_item || !newItem.nama_item || addItemMutation.isPending}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#ffffff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: (!newItem.kod_item || !newItem.nama_item || addItemMutation.isPending) ? 0.6 : 1 }}>
                  {addItemMutation.isPending ? <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Menyimpan...</span> : "Simpan"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Main Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div style={{ position: "relative", borderRadius: "16px", marginBottom: "16px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(24, 119, 242, 0.15), rgba(6, 182, 212, 0.1))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
          <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Accent bar */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, #7c3aed, #1877f2, #06b6d4, #7c3aed)", backgroundSize: "200% 100%", animation: "gradientShift 4s ease infinite" }} />

            {/* Search + Count */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "400px" }}>
                <Search size={16} color={searchFocused ? "#7c3aed" : "#9ca3af"} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                  placeholder="Cari Item..."
                  style={{ ...inputStyle, paddingLeft: "36px", ...(searchFocused ? { borderColor: "rgba(124, 58, 237, 0.4)", boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.08)" } : {}) }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.05)", border: "1px solid rgba(124, 58, 237, 0.1)", fontSize: "12px", fontWeight: 600, color: "#65676b", flexShrink: 0 }}>
                <Package size={14} color="#7c3aed" />
                {data?.total || 0} item
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid rgba(124, 58, 237, 0.15)", borderTopColor: "#7c3aed", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan item...</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 100px 60px", gap: "12px", padding: "10px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", background: "linear-gradient(90deg, rgba(240, 242, 245, 0.6), rgba(240, 242, 245, 0.2))", fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em" }} className="stok-table-header">
                  <div onClick={() => toggleSort("kod_item")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><Hash size={12} /> Kod <SortIcon columnKey="kod_item" /></div>
                  <div onClick={() => toggleSort("nama_item")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><Pill size={12} /> Nama Item <SortIcon columnKey="nama_item" /></div>
                  <div onClick={() => toggleSort("kuota")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><BarChart3 size={12} /> Kuota <SortIcon columnKey="kuota" /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Boxes size={12} /> Stok</div>
                  <div style={{ textAlign: "center" }}></div>
                </div>

                {/* Rows */}
                {(data?.items as any[])?.length === 0 ? (
                  <div style={{ padding: "60px 24px", textAlign: "center" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(240, 242, 245, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <Package size={22} color="#9ca3af" />
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "#65676b" }}>Tiada item dijumpai.</p>
                  </div>
                ) : (
                  (data?.items as any[])?.map((item: any) => {
                    const totalStock = item.item_batches?.reduce((sum: number, b: any) => sum + (b.kuantiti || 0), 0) || 0;
                    const bentukDos = formsMap.get(item.id_bentuk) || "";
                    const namaDisplay = [item.nama_item, item.kekuatan, bentukDos].filter(Boolean).join(" ");
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <div className="stok-row" onClick={() => router.push(`/stok/${item.id}`)}
                          style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 100px 60px", gap: "12px", padding: "14px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.3)", cursor: "pointer", transition: "background 0.15s ease" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(124, 58, 237, 0.03)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                          <div style={{ fontSize: "13px", color: "#7c3aed", fontWeight: 600, fontFamily: "monospace", display: "flex", alignItems: "center" }}>{item.kod_item}</div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontSize: "13px", fontWeight: 500, color: "#1c1e21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{namaDisplay}</span>
                            {item.nama_dagangan && <span style={{ fontSize: "11px", color: "#9ca3af" }}>{item.nama_dagangan}</span>}
                          </div>
                          <div style={{ fontSize: "13px", color: "#1c1e21", display: "flex", alignItems: "center" }}>{item.kuota ?? <span style={{ color: "#9ca3af" }}>-</span>}</div>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: totalStock > 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(228, 30, 63, 0.1)", color: totalStock > 0 ? "#16a34a" : "#e41e3f", border: totalStock > 0 ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(228, 30, 63, 0.2)" }}>
                              {totalStock}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Eye size={14} color="#9ca3af" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid rgba(221, 223, 226, 0.5)", background: "rgba(240, 242, 245, 0.2)" }}>
                    <p style={{ fontSize: "12px", color: "#65676b" }}>Halaman {page + 1} daripada {totalPages} ({data?.total || 0} item)</p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #dddfe2", background: "#ffffff", color: "#1c1e21", cursor: page === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum = i;
                        if (totalPages > 7) { if (page < 3) pageNum = i; else if (page > totalPages - 4) pageNum = totalPages - 7 + i; else pageNum = page - 3 + i; }
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)}
                            style={{ minWidth: "32px", height: "32px", borderRadius: "8px", border: pageNum === page ? "none" : "1px solid #dddfe2", background: pageNum === page ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#ffffff", color: pageNum === page ? "#ffffff" : "#1c1e21", fontSize: "12px", fontWeight: pageNum === page ? 600 : 400, cursor: "pointer", padding: "0 8px" }}>
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #dddfe2", background: "#ffffff", color: "#1c1e21", cursor: page >= totalPages - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page >= totalPages - 1 ? 0.4 : 1 }}><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      <style>{`
        @-webkit-keyframes spin { from { -webkit-transform: rotate(0deg); } to { -webkit-transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @-webkit-keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @media (max-width: 768px) {
          .stok-table-header, .stok-row { grid-template-columns: 1fr !important; }
          .stok-row > div:nth-child(1) { font-size: 11px; }
          .stok-row > div:nth-child(3), .stok-row > div:nth-child(4), .stok-row > div:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  );
}