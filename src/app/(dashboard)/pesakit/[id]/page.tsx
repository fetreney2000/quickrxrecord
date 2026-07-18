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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Breadcrumb, getNavSource } from "@/components/ui/breadcrumb";
import { ArrowLeft, Plus, Edit, XCircle, Package, Merge, Trash2, ChevronDown, ChevronUp, ClipboardList, Activity, Search, UserX, ShieldAlert, ChevronLeft, ChevronRight, User, Phone, MapPin, Calendar, FileText, AlertTriangle, CheckCircle, Save, Ban, ArrowUpDown, RefreshCw, Info, Sparkles, IdCard, Hospital, Pill } from "lucide-react";
import { MergeDialog } from "@/components/pesakit/merge-dialog";
import type { Patient, PatientItemAssignment, Item, ItemBatch, ItemForm } from "@/types";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) {
  const variants: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: "#f0f2f5", color: "#65676b", border: "#dddfe2" },
    destructive: { bg: "rgba(228,30,63,0.1)", color: "#e41e3f", border: "rgba(228,30,63,0.2)" },
    success: { bg: "rgba(34,197,94,0.1)", color: "#16a34a", border: "rgba(34,197,94,0.2)" },
  };
  const v = variants[variant] || variants.default;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>{children}</span>;
}

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: { key: string; dir: SortDir } | null; onSort: (k: string) => void }) {
  const active = currentSort?.key === sortKey;
  return (
    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", borderBottom: "2px solid #e5e7eb", userSelect: "none" }} onClick={() => onSort(sortKey)}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>{label} {active ? (currentSort?.dir === "asc" ? <ChevronUp size={12} color="#1877f2" /> : <ChevronDown size={12} color="#1877f2" />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}</div>
    </th>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", transition: "background 0.2s" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(24,119,242,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color="#1877f2" />
      </div>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{label}</p>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>{value || "-"}</p>
      </div>
    </div>
  );
}

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

  const { data: patient, isLoading: patientLoading } = useQuery({ queryKey: ["patient", id], queryFn: async () => { const { data, error } = await supabase.from("patients").select("*").eq("id", id).single(); if (error) throw error; return data as Patient; } });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({ queryKey: ["assignments", id], queryFn: async () => { const { data, error } = await supabase.from("patient_item_assignments").select("*, item:items(*)").eq("patient_id", id).order("created_at", { ascending: false }); if (error) throw error; return data as (PatientItemAssignment & { item: Item })[]; } });
  const { data: forms } = useQuery({ queryKey: ["item_forms"], queryFn: async () => { const { data } = await supabase.from("item_forms").select("id, nama"); return (data || []) as Pick<ItemForm, "id" | "nama">[]; }, staleTime: 60000 });
  const formsMap = useMemo(() => { const map = new Map<string, string>(); forms?.forEach(f => map.set(f.id, f.nama)); return map; }, [forms]);
  const { data: items } = useQuery({ queryKey: ["items-with-stats"], queryFn: async () => { const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, id_bentuk, kuota").eq("aktif", true).order("nama_item"); if (error) throw error; const itemsList = data as any[]; const { data: counts } = await supabase.from("patient_item_assignments").select("item_id").eq("aktif", true); const m: Record<string, number> = {}; for (const c of (counts || [])) m[c.item_id] = (m[c.item_id] || 0) + 1; return itemsList.map(item => ({ ...item, patient_count: m[item.id] || 0, baki_kuota: item.kuota != null ? Math.max(0, item.kuota - (m[item.id] || 0)) : null })); } });
  const getItemDisplayName = useCallback((item: any) => { if (!item) return ""; const f = formsMap.get(item.id_bentuk) || ""; return [item.nama_item, item.kekuatan, f].filter(Boolean).join(" "); }, [formsMap]);
  const { data: doseHistory } = useQuery({ queryKey: ["dose-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data: d } = await supabase.from("dose_history").select("*").eq("assignment_id", expandedAssignment).order("tarikh", { ascending: false }); return d || []; }, enabled: !!expandedAssignment });
  const { data: supplyHistory } = useQuery({ queryKey: ["supply-history", expandedAssignment], queryFn: async () => { if (!expandedAssignment) return []; const { data, error } = await supabase.from("supply_records").select("*, batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)").eq("assignment_id", expandedAssignment).order("created_at", { ascending: false }); if (error) throw error; return data as any[]; }, enabled: !!expandedAssignment });

  const updatePatientMutation = useMutation({ mutationFn: async (updates: Partial<Patient>) => { const { error } = await supabase.from("patients").update(updates).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Maklumat dikemaskini."); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); }, onError: () => toast.error("Gagal mengemaskini.") });
  const toggleActiveMutation = useMutation({ mutationFn: async ({ aktif }: { aktif: boolean }) => { const { error } = await supabase.from("patients").update({ aktif }).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Status dikemaskini."); setOpenDeactivate(false); queryClient.invalidateQueries({ queryKey: ["patient", id] }); } });
  const addAssignmentMutation = useMutation({ mutationFn: async (data: typeof newAssignment) => { const { error } = await supabase.from("patient_item_assignments").insert({ patient_id: id, item_id: data.item_id, dos: data.dos || null, tarikh_mula_guna: data.tarikh_mula_guna, dimulakan_oleh: profile?.id, kakitangan_farmasi_perekod: profile?.id }); if (error) throw error; }, onSuccess: () => { toast.success("Item ditambah."); setOpenAddAssignment(false); setSelectedItemId(null); setItemSearch(""); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); queryClient.invalidateQueries({ queryKey: ["items-with-stats"] }); } });
  const stopAssignmentMutation = useMutation({ mutationFn: async ({ assignmentId, sebab }: { assignmentId: string; sebab: string }) => { const { error } = await supabase.from("patient_item_assignments").update({ tarikh_tamat_guna: new Date().toISOString().split("T")[0], ditamatkan_oleh: profile?.id, sebab_tamat: sebab, aktif: false }).eq("id", assignmentId); if (error) throw error; }, onSuccess: () => { toast.success("Item ditamatkan."); setOpenStopAssign(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const updateDoseMutation = useMutation({ mutationFn: async ({ assignmentId, dos }: { assignmentId: string; dos: string }) => { await supabase.from("patient_item_assignments").update({ dos }).eq("id", assignmentId); await supabase.from("dose_history").insert({ assignment_id: assignmentId, tarikh: new Date().toISOString().split("T")[0], dos, aktif: true, dikemaskini_oleh: profile?.id }); }, onSuccess: () => { toast.success("Dos dikemaskini."); setOpenUpdateDose(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const { data: availableBatches } = useQuery({ queryKey: ["batches", openSupply], queryFn: async () => { if (!openSupply) return []; const a = assignments?.find(x => x.id === openSupply); if (!a) return []; const { data, error } = await supabase.from("item_batches").select("*").eq("item_id", a.item_id).gt("kuantiti", 0).gte("tarikh_luput", new Date().toISOString().split("T")[0]).order("tarikh_luput"); if (error) throw error; return data as ItemBatch[]; }, enabled: !!openSupply });
  const supplyMutation = useMutation({ mutationFn: async (data: typeof supplyData & { assignment_id: string; dos: string }) => { const res = await fetch("/api/supply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, dos: data.dos, tempoh_dibekal: `${data.tempoh_nilai} ${data.tempoh_unit}`, kakitangan_pembekal: profile?.id }) }); if (!res.ok) { const r = await res.json(); throw new Error(r.error); } }, onSuccess: () => { toast.success("Bekalan direkodkan."); setOpenSupply(null); queryClient.invalidateQueries({ queryKey: ["assignments", id] }); } });
  const deleteSupplyMutation = useMutation({ mutationFn: async (sid: string) => { await supabase.from("supply_records").delete().eq("id", sid); }, onSuccess: () => { toast.success("Rekod dipadam."); setOpenDeleteSupply(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });
  const saveEditSupplyMutation = useMutation({ mutationFn: async ({ supplyId, updates }: { supplyId: string; updates: any }) => { await supabase.from("supply_records").update({ dos: updates.dos, tempoh_dibekal: updates.tempoh_dibekal, kuantiti: parseInt(updates.kuantiti), catatan_bekalan: updates.catatan_bekalan || null }).eq("id", supplyId); }, onSuccess: () => { toast.success("Dikemaskini."); setEditSupplyRecord(null); queryClient.invalidateQueries({ queryKey: ["supply-history", expandedAssignment] }); } });

  const sortData = (data: any[], sort: { key: string; dir: SortDir } | null) => { if (!sort) return data; return [...data].sort((a, b) => { const cmp = (a[sort.key] || "").toString().localeCompare((b[sort.key] || "").toString(), "ms"); return sort.dir === "asc" ? cmp : -cmp; }); };
  const toggleSort = (sort: any, setSort: any, key: string) => { setSort(sort?.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }); };
  const sortedAssignments = useMemo(() => sortData(assignments || [], assignmentSort), [assignments, assignmentSort]);
  const pagedAssignments = useMemo(() => sortedAssignments.slice(assignmentPage * PAGE_SIZE, (assignmentPage + 1) * PAGE_SIZE), [sortedAssignments, assignmentPage]);
  const totalPages = Math.ceil((sortedAssignments.length || 0) / PAGE_SIZE);
  const sortedDoseHistory = useMemo(() => sortData(doseHistory || [], doseSort), [doseHistory, doseSort]);
  const sortedSupplyHistory = useMemo(() => sortData(supplyHistory || [], supplySort), [supplyHistory, supplySort]);
  const filteredItems = (items || []).filter((item: any) => !itemSearch || item.nama_item.toLowerCase().includes(itemSearch.toLowerCase()));
  const totalCount = assignments?.length || 0;
  const filteredPatients = useMemo(() => { if (!assignments) return []; let f = assignments; if (itemSearch) f = f.filter((a: any) => a.patient?.nama?.toLowerCase().includes(itemSearch.toLowerCase())); return f; }, [assignments, itemSearch]);

  if (patientLoading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}><p style={{ color: "#65676b" }}>Memuatkan...</p></div>;
  if (!patient) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}><p style={{ color: "#65676b" }}>Pesakit tidak dijumpai.</p></div>;

  const currentAssignment = openSupply ? assignments?.find(a => a.id === openSupply) : null;
  const toggleExpand = (id: string) => { setExpandedAssignment(expandedAssignment === id ? null : id); };

  const cardStyle: React.CSSProperties = { position: "relative", borderRadius: "16px", marginBottom: "20px" };
  const cardBorder: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(24,119,242,0.3), rgba(124,58,237,0.2), rgba(6,182,212,0.15))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" };
  const cardInner: React.CSSProperties = { borderRadius: "16px", background: "rgba(255,255,255,0.06)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)", overflow: "hidden" };
  const inputStyle: React.CSSProperties = { width: "100%", height: "40px", padding: "0 14px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
  const btnPrimary: React.CSSProperties = { padding: "8px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #1877f2, #0d5bd4)", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 12px rgba(24,119,242,0.3)" };
  const btnOutline: React.CSSProperties = { padding: "8px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" };
  const btnDanger: React.CSSProperties = { ...btnPrimary, background: "linear-gradient(135deg, #e41e3f, #c41e3a)", boxShadow: "0 4px 12px rgba(228,30,63,0.3)" };

  return (
    <div style={{ background: "#0a0e27", minHeight: "100vh", color: "#fff", padding: "0 24px 80px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(24,119,242,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.04) 0%, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto", paddingTop: "24px" }}>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: "20px" }}>
          <Breadcrumb items={(() => { const source = getNavSource(); if (source?.startsWith("stok:")) { const n = source.replace("stok:", ""); return [{ label: "Inventori", href: "/stok" }, ...(n ? [{ label: n }] : []), { label: patient.nama }]; } return [{ label: "Pesakit", href: "/pesakit" }, { label: patient.nama }]; })()} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
          <button onClick={() => router.push("/pesakit")} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(24,119,242,0.15)", background: "rgba(24,119,242,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={20} color="#1877f2" /></button>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>Butiran Pesakit</h1>
        </motion.div>

        {/* Patient Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={cardStyle}>
            <div style={cardBorder} />
            <div style={cardInner}>
              <div style={{ height: "3px", background: "linear-gradient(90deg, #1877f2, #7c3aed, #06b6d4)" }} />
              <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(24,119,242,0.3)" }}><User size={22} color="#fff" /></div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>{patient.nama}</span>
                      <Badge variant={patient.aktif ? "success" : "destructive"}>{patient.aktif ? "Aktif" : "Tidak Aktif"}</Badge>
                    </div>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Daftar: {formatDate(patient.created_at)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {canEdit && <button onClick={() => setOpenMerge(true)} style={btnOutline}><Merge size={14} /> Gabung</button>}
                  {canEdit && !editMode && <button onClick={() => { setEditMode(true); setEditData(patient); }} style={btnOutline}><Edit size={14} /> Edit</button>}
                  {canEdit && <button onClick={() => setOpenDeactivate(true)} style={patient.aktif ? btnDanger : btnPrimary}>{patient.aktif ? "Nyahaktif" : "Aktifkan"}</button>}
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                {editMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Nama</Label><Input value={editData.nama || ""} onChange={e => setEditData({ ...editData, nama: e.target.value })} style={inputStyle} /></div>
                      <div><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>No. KP</Label><Input value={editData.nombor_kad_pengenalan || ""} onChange={e => setEditData({ ...editData, nombor_kad_pengenalan: e.target.value })} style={inputStyle} /></div>
                      <div><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>No. Telefon</Label><Input value={editData.nombor_telefon || ""} onChange={e => setEditData({ ...editData, nombor_telefon: e.target.value })} style={inputStyle} /></div>
                      <div><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>No. Hospital</Label><Input value={editData.nombor_pendaftaran_hospital || ""} onChange={e => setEditData({ ...editData, nombor_pendaftaran_hospital: e.target.value })} style={inputStyle} /></div>
                    </div>
                    <div><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Alamat</Label><Textarea value={editData.alamat || ""} onChange={e => setEditData({ ...editData, alamat: e.target.value })} style={{ ...inputStyle, height: "72px", padding: "10px 14px", resize: "vertical" as const }} /></div>
                    <div style={{ display: "flex", gap: "8px" }}><button onClick={() => updatePatientMutation.mutate(editData)} style={btnPrimary}><Save size={14} /> Simpan</button><button onClick={() => setEditMode(false)} style={btnOutline}>Batal</button></div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                    <InfoRow icon={IdCard} label="No. KP" value={patient.nombor_kad_pengenalan || "-"} />
                    <InfoRow icon={Hospital} label="No. Hospital" value={patient.nombor_pendaftaran_hospital || "-"} />
                    <InfoRow icon={Phone} label="No. Telefon" value={patient.nombor_telefon || "-"} />
                    <InfoRow icon={Calendar} label="Tarikh Daftar" value={formatDate(patient.created_at)} />
                    <InfoRow icon={MapPin} label="Alamat" value={patient.alamat || "-"} />
                    {patient.catatan && <InfoRow icon={FileText} label="Catatan" value={patient.catatan} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Deactivate Dialog */}
        <Dialog open={openDeactivate} onOpenChange={setOpenDeactivate}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#e41e3f" }}><ShieldAlert size={18} /> Nyahaktifkan Pesakit</DialogTitle></DialogHeader>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "12px 0" }}>Anda akan menyahaktifkan pesakit ini.</p>
            <DialogFooter><button onClick={() => setOpenDeactivate(false)} style={btnOutline}>Batal</button><button onClick={() => toggleActiveMutation.mutate({ aktif: false })} style={btnDanger}>Ya, Nyahaktifkan</button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Assignments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div style={cardStyle}>
            <div style={cardBorder} />
            <div style={cardInner}>
              <div style={{ height: "3px", background: "linear-gradient(90deg, #7c3aed, #1877f2, #06b6d4)" }} />
              <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><Pill size={16} color="#a78bfa" /></div>
                  <div><span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>Item Didaftarkan</span><span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginLeft: "8px" }}>{totalCount} rekod</span></div>
                </div>
                {patient.aktif && canEdit && (
                  <Dialog open={openAddAssignment} onOpenChange={(v) => { setOpenAddAssignment(v); if (!v) { setSelectedItemId(null); setItemSearch(""); } }}>
                    <DialogTrigger asChild><button style={btnPrimary}><Plus size={14} /> Tambah Item</button></DialogTrigger>
                    <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <DialogHeader><DialogTitle style={{ color: "#fff" }}><Sparkles size={18} /> Tambah Item</DialogTitle></DialogHeader>
                      <div style={{ padding: "16px 0" }}>
                        <input type="search" placeholder="Cari item..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} style={{ ...inputStyle, marginBottom: "12px" }} />
                        <div style={{ maxHeight: "240px", overflow: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {(items || []).filter((i: any) => !itemSearch || i.nama_item.toLowerCase().includes(itemSearch.toLowerCase())).map((item: any) => (
                            <div key={item.id} onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", background: selectedItemId === item.id ? "rgba(24,119,242,0.1)" : "transparent", transition: "background 0.15s" }}>
                              <div style={{ fontWeight: 500, color: "#fff", fontSize: "13px" }}>{item.nama_item} {item.kekuatan}</div>
                              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{item.kod_item} | Baki: {item.baki_kuota ?? "-"}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: "12px" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Dos</Label><Input value={newAssignment.dos} onChange={e => setNewAssignment({ ...newAssignment, dos: e.target.value })} placeholder="cth: 1 biji 2x sehari" style={inputStyle} /></div>
                      </div>
                      <DialogFooter><button onClick={() => setOpenAddAssignment(false)} style={btnOutline}>Batal</button><button onClick={() => { if (selectedItemId) addAssignmentMutation.mutate({ ...newAssignment, item_id: selectedItemId }); }} style={btnPrimary}>Simpan</button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div style={{ padding: "0 24px 24px" }}>
                {pagedAssignments.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px 0" }}>Tiada item didaftarkan.</p>
                ) : pagedAssignments.map((a: any) => (
                  <div key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div onClick={() => toggleExpand(a.id)} style={{ padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(24,119,242,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><Pill size={14} color="#60a5fa" /></div>
                        <div><div style={{ fontWeight: 500, color: "#fff", fontSize: "13px" }}>{getItemDisplayName(a.item)}</div><div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{a.dos || "-"} | {formatDate(a.tarikh_mula_guna)}</div></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Badge variant={a.aktif ? "success" : "default"}>{a.aktif ? "Aktif" : "Tamat"}</Badge>
                        <motion.div animate={{ rotate: expandedAssignment === a.id ? 180 : 0 }}><ChevronDown size={14} color="rgba(255,255,255,0.4)" /></motion.div>
                      </div>
                    </div>
                    {expandedAssignment === a.id && (
                      <div style={{ padding: "0 0 16px", borderLeft: "2px solid rgba(24,119,242,0.3)", marginLeft: "16px" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          {a.aktif && <button onClick={() => setOpenSupply(a.id)} style={btnPrimary}><Package size={14} /> Bekal</button>}
                          {a.aktif && <button onClick={() => { setOpenUpdateDose(a.id); setDoseUpdate({ dos: a.dos || "", catatan: "" }); }} style={btnOutline}><Edit size={14} /> Kemaskini Dos</button>}
                          {canEdit && a.aktif && <button onClick={() => { setOpenStopAssign(a.id); setStopReason(""); }} style={btnDanger}><XCircle size={14} /> Tamatkan</button>}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px", cursor: "pointer" }} onClick={() => setFoldDose(!foldDose)}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Activity size={14} color="#60a5fa" /> Sejarah Dos ({doseHistory?.length || 0})</div>
                        </div>
                        {!foldDose && sortedDoseHistory.length > 0 && (
                          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                            <thead><tr><SortableHeader label="Tarikh" sortKey="tarikh" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} /><SortableHeader label="Dos" sortKey="dos" currentSort={doseSort} onSort={k => toggleSort(doseSort, setDoseSort, k)} /></tr></thead>
                            <tbody>{sortedDoseHistory.map((d: any) => <tr key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}><td style={{ padding: "8px 16px", fontSize: "13px", color: "#fff" }}>{formatDate(d.tarikh)}</td><td style={{ padding: "8px 16px", fontSize: "13px", color: "#fff" }}>{d.dos}</td></tr>)}</tbody>
                          </table>
                        )}
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px", cursor: "pointer" }} onClick={() => setFoldSupply(!foldSupply)}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><ClipboardList size={14} color="#10b981" /> Sejarah Bekalan ({supplyHistory?.length || 0})</div>
                        </div>
                        {!foldSupply && sortedSupplyHistory.length > 0 && (
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr><SortableHeader label="Tarikh" sortKey="tarikh_dibekal" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} /><SortableHeader label="Kuantiti" sortKey="kuantiti" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} /><SortableHeader label="Kelompok" sortKey="batch" currentSort={supplySort} onSort={k => toggleSort(supplySort, setSupplySort, k)} /></tr></thead>
                            <tbody>{sortedSupplyHistory.map((r: any) => <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}><td style={{ padding: "8px 16px", fontSize: "13px", color: "#fff" }}>{formatDate(r.tarikh_dibekal)}</td><td style={{ padding: "8px 16px", fontSize: "13px", color: "#fff" }}>{r.kuantiti}</td><td style={{ padding: "8px 16px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{r.batch?.nombor_kelompok || "-"}</td></tr>)}</tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {totalPages > 1 && <div style={{ display: "flex", justifyContent: "center", gap: "4px", padding: "16px 0" }}>{Array.from({ length: totalPages }, (_, i) => <button key={i} onClick={() => setAssignmentPage(i)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: i === assignmentPage ? "none" : "1px solid rgba(255,255,255,0.1)", background: i === assignmentPage ? "#1877f2" : "rgba(255,255,255,0.05)", color: "#fff", fontSize: "12px", fontWeight: i === assignmentPage ? 700 : 400, cursor: "pointer" }}>{i + 1}</button>)}</div>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dialogs */}
        <Dialog open={!!openStopAssign} onOpenChange={() => setOpenStopAssign(null)}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#e41e3f" }}><XCircle size={18} /> Tamatkan Item</DialogTitle></DialogHeader>
            <div style={{ margin: "16px 0" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Sebab Tamat</Label><Select value={stopReason} onValueChange={setStopReason}><SelectTrigger style={inputStyle}><SelectValue placeholder="Pilih sebab" /></SelectTrigger><SelectContent><SelectItem value="Tukar kepada item lain">Tukar kepada item lain</SelectItem><SelectItem value="Pesakit tamat rawatan">Pesakit tamat rawatan</SelectItem><SelectItem value="Pesakit tidak datang">Pesakit tidak datang</SelectItem><SelectItem value="Reaksi buruk / alahan">Reaksi buruk / alahan</SelectItem><SelectItem value="Atas nasihat doktor">Atas nasihat doktor</SelectItem><SelectItem value="Lain-lain">Lain-lain</SelectItem></SelectContent></Select></div>
            <DialogFooter><button onClick={() => setOpenStopAssign(null)} style={btnOutline}>Batal</button><button onClick={() => { if (openStopAssign && stopReason) stopAssignmentMutation.mutate({ assignmentId: openStopAssign, sebab: stopReason }); }} style={btnDanger} disabled={!stopReason}>Ya, Tamatkan</button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!openDeleteSupply} onOpenChange={() => setOpenDeleteSupply(null)}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#e41e3f" }}><Trash2 size={18} /> Padam Rekod</DialogTitle></DialogHeader>
            <DialogFooter><button onClick={() => setOpenDeleteSupply(null)} style={btnOutline}>Batal</button><button onClick={() => { if (openDeleteSupply) deleteSupplyMutation.mutate(openDeleteSupply.id); }} style={btnDanger}>Padamkan</button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editSupplyRecord} onOpenChange={() => setEditSupplyRecord(null)}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#fff" }}><Edit size={18} /> Edit Rekod</DialogTitle></DialogHeader>
            <div style={{ padding: "16px 0" }}>
              <div style={{ marginBottom: "12px" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Dos</Label><Input value={editSupplyRecord?.editDos ?? editSupplyRecord?.dos} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editDos: e.target.value })} style={inputStyle} /></div>
              <div style={{ marginBottom: "12px" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Kuantiti</Label><Input type="number" value={editSupplyRecord?.editKuantiti ?? editSupplyRecord?.kuantiti} onChange={e => setEditSupplyRecord({ ...editSupplyRecord, editKuantiti: e.target.value })} style={inputStyle} /></div>
            </div>
            <DialogFooter><button onClick={() => setEditSupplyRecord(null)} style={btnOutline}>Batal</button><button onClick={() => { if (editSupplyRecord) saveEditSupplyMutation.mutate({ supplyId: editSupplyRecord.id, updates: { dos: editSupplyRecord.editDos ?? editSupplyRecord.dos, tempoh_dibekal: editSupplyRecord.editTempoh ?? editSupplyRecord.tempoh_dibekal, kuantiti: editSupplyRecord.editKuantiti ?? editSupplyRecord.kuantiti, catatan_bekalan: "" } }); }} style={btnPrimary}>Simpan</button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!openUpdateDose} onOpenChange={() => setOpenUpdateDose(null)}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#fff" }}><Edit size={18} /> Kemaskini Dos</DialogTitle></DialogHeader>
            <div style={{ padding: "16px 0" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Dos Baru</Label><Input value={doseUpdate.dos} onChange={e => setDoseUpdate({ ...doseUpdate, dos: e.target.value })} style={inputStyle} /></div>
            <DialogFooter><button onClick={() => setOpenUpdateDose(null)} style={btnOutline}>Batal</button><button onClick={() => { if (openUpdateDose) updateDoseMutation.mutate({ assignmentId: openUpdateDose, dos: doseUpdate.dos }); }} style={btnPrimary}>Simpan</button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!openSupply} onOpenChange={() => setOpenSupply(null)}>
          <DialogContent style={{ background: "rgba(26,30,56,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}><DialogHeader><DialogTitle style={{ color: "#fff" }}><Package size={18} /> Bekal Ubat</DialogTitle></DialogHeader>
            <div style={{ padding: "16px 0" }}>
              <div style={{ marginBottom: "12px" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Dos Semasa</Label><Input value={currentAssignment?.dos || "-"} readOnly style={{ ...inputStyle, opacity: 0.5 }} /></div>
              <div style={{ marginBottom: "12px" }}><Label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Kuantiti</Label><Input type="number" value={supplyData.kuantiti} onChange={e => setSupplyData({ ...supplyData, kuantiti: e.target.value })} style={inputStyle} /></div>
            </div>
            <DialogFooter><button onClick={() => setOpenSupply(null)} style={btnOutline}>Batal</button><button onClick={() => { if (openSupply && currentAssignment) supplyMutation.mutate({ ...supplyData, assignment_id: openSupply, dos: currentAssignment.dos || "" }); }} style={btnPrimary}>Bekal</button></DialogFooter>
          </DialogContent>
        </Dialog>

        {patient && <MergeDialog open={openMerge} onOpenChange={setOpenMerge} primaryPatient={patient} />}
      </div>
      <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} @media(max-width:768px){.login-branding-section{display:none!important}.login-mobile-logo{display:block!important}}`}</style>
    </div>
  );
}