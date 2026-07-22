"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, ArrowUpDown, User,
  IdCard, Phone, RefreshCw, Users, ArrowRight,
  Activity, Calendar,
} from "lucide-react";
import { formatDate, toTitleCase, formatMyKad, formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import { setNavSource } from "@/components/ui/breadcrumb";
import type { Patient } from "@/types";

type SortDir = "asc" | "desc";
const PAGE_SIZE = 100;

export default function PesakitPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [newPatient, setNewPatient] = useState({
    nama: "", nombor_kad_pengenalan: "", nombor_pendaftaran_hospital: "",
    nombor_telefon: "", alamat: "", catatan: "",
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const canEdit = hasPermission(profile?.peranan, "manage_patients");
  const [duplicateWarning, setDuplicateWarning] = useState<{ type: string; patient: Patient } | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const kp = newPatient.nombor_kad_pengenalan.trim();
    const hosp = newPatient.nombor_pendaftaran_hospital.trim();
    if (!kp && !hosp) { setDuplicateWarning(null); return; }
    lookupTimer.current = setTimeout(async () => {
      try {
        const filters: string[] = [];
        if (kp) filters.push(`nombor_kad_pengenalan.eq.${kp}`);
        if (hosp) filters.push(`nombor_pendaftaran_hospital.eq.${hosp}`);
        const { data: matches } = await supabase.from("patients")
          .select("*")
          .or(filters.join(","))
          .limit(1);
        if (matches && matches.length > 0) {
          setDuplicateWarning({ type: kp ? "No. Kad Pengenalan" : "No. Pendaftaran Hospital", patient: matches[0] as Patient });
        } else {
          setDuplicateWarning(null);
        }
      } catch { setDuplicateWarning(null); }
    }, 600);
  }, [newPatient.nombor_kad_pengenalan, newPatient.nombor_pendaftaran_hospital]);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page, sort],
    queryFn: async () => {
      const sortKey = sort?.key || "nama";
      const sortDir = sort?.dir || "asc";
      const countQuery = supabase.from("patients").select("*", { count: "exact", head: true }).eq("aktif", true).is("merged_into", null);
      let dataQuery = supabase.from("patients").select("*").eq("aktif", true).is("merged_into", null).order(sortKey, { ascending: sortDir === "asc" }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) {
        const filter = `nama.ilike.%${search}%,nombor_kad_pengenalan.ilike.%${search}%,nombor_pendaftaran_hospital.ilike.%${search}%`;
        countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }
      const [{ count }, { data: patients, error }] = await Promise.all([countQuery, dataQuery]);
      if (error) throw error;
      return { patients: (patients as Patient[]) || [], total: count || 0 };
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: async (patient: typeof newPatient) => {
      const { data: inserted, error } = await supabase.from("patients").insert({
        ...patient,
        nombor_kad_pengenalan: patient.nombor_kad_pengenalan || null,
        nombor_pendaftaran_hospital: patient.nombor_pendaftaran_hospital || null,
        nombor_telefon: patient.nombor_telefon || null,
        alamat: patient.alamat || null,
        catatan: patient.catatan || null,
      }).select("id").single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (inserted) => {
      toast.success("Pesakit berjaya ditambah.");
      setOpenAdd(false);
      setNewPatient({ nama: "", nombor_kad_pengenalan: "", nombor_pendaftaran_hospital: "", nombor_telefon: "", alamat: "", catatan: "" });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      router.push(`/pesakit/${inserted.id}`);
    },
    onError: () => { toast.error("Gagal menambah pesakit."); },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const toggleSort = useCallback((key: string) => {
    if (sort?.key === key) { setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" }); }
    else { setSort({ key, dir: "asc" }); }
    setPage(0);
  }, [sort]);

  const SortIcon = useCallback(({ columnKey }: { columnKey: string }) => {
    if (sort?.key !== columnKey) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sort.dir === "asc" ? <ChevronUp size={12} color="#1877f2" /> : <ChevronDown size={12} color="#1877f2" />;
  }, [sort]);

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
        <Breadcrumb items={[{ label: "Senarai Pesakit" }]} />
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #1877f2, #0d5bd4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(24, 119, 242, 0.3)", flexShrink: 0 }}>
            <Users size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>Senarai Pesakit</h1>
            <p style={{ fontSize: "13px", color: "#65676b", fontWeight: 500 }}>Urus rekod pesakit</p>
          </div>
        </div>
        {canEdit && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #1877f2, #0d5bd4)", color: "#ffffff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 12px rgba(24, 119, 242, 0.25)", transition: "all 0.2s ease" }}>
                <Plus size={16} /> Daftar Pesakit
              </button>
            </DialogTrigger>
            <DialogContent style={{ maxWidth: "500px", borderRadius: "16px", border: "1px solid rgba(24, 119, 242, 0.1)", boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
              <DialogHeader>
                <DialogTitle style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={18} color="#1877f2" /> Daftar Pesakit Baharu
                </DialogTitle>
                <DialogDescription style={{ fontSize: "13px" }}>Isi maklumat pesakit di bawah.</DialogDescription>
              </DialogHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><User size={12} /> Nama *</Label>
                  <Input value={newPatient.nama} onChange={(e) => setNewPatient({ ...newPatient, nama: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, nama: toTitleCase(e.target.value.trim()) })} style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><IdCard size={12} /> No. Kad Pengenalan</Label>
                    <Input value={newPatient.nombor_kad_pengenalan} onChange={(e) => setNewPatient({ ...newPatient, nombor_kad_pengenalan: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, nombor_kad_pengenalan: formatMyKad(e.target.value.trim()) })} style={inputStyle} />
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Activity size={12} /> No. Pendaftaran Hospital</Label>
                    <Input value={newPatient.nombor_pendaftaran_hospital} onChange={(e) => setNewPatient({ ...newPatient, nombor_pendaftaran_hospital: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, nombor_pendaftaran_hospital: e.target.value.trim().toUpperCase() })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={12} /> No. Telefon</Label>
                  <Input value={newPatient.nombor_telefon} onChange={(e) => setNewPatient({ ...newPatient, nombor_telefon: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, nombor_telefon: formatPhone(e.target.value.trim()) })} style={inputStyle} />
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px" }}>Alamat</Label>
                  <Textarea value={newPatient.alamat} onChange={(e) => setNewPatient({ ...newPatient, alamat: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, alamat: toTitleCase(e.target.value.trim()) })} style={{ ...inputStyle, height: "72px", padding: "10px 14px", resize: "vertical" as const }} />
                </div>
                <div>
                  <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px" }}>Catatan</Label>
                  <Textarea value={newPatient.catatan} onChange={(e) => setNewPatient({ ...newPatient, catatan: e.target.value })} onBlur={(e) => setNewPatient({ ...newPatient, catatan: e.target.value.trim() })} style={{ ...inputStyle, height: "72px", padding: "10px 14px", resize: "vertical" as const }} />
                </div>
              </div>
              {duplicateWarning && (
                <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#d97706", margin: 0 }}>
                    ⚠️ Pesakit dengan {duplicateWarning.type} ini sudah didaftarkan.
                  </p>
                  <p style={{ fontSize: "12px", color: "#92400e", margin: 0 }}>
                    {duplicateWarning.patient.nama} —{" "}
                    <span
                      onClick={() => { setOpenAdd(false); router.push(`/pesakit/${duplicateWarning.patient.id}`); }}
                      style={{ color: "#1877f2", cursor: "pointer", textDecoration: "underline", fontWeight: 500 }}
                    >Lihat butiran pesakit</span>
                  </p>
                  <p style={{ fontSize: "11px", color: "#92400e", margin: 0 }}>Anda boleh teruskan pendaftaran jika perlu.</p>
                </div>
              )}
              <DialogFooter style={{ gap: "8px", marginTop: "8px" }}>
                <button onClick={() => setOpenAdd(false)} style={{ padding: "8px 16px", borderRadius: "10px", border: "1.5px solid #dddfe2", background: "#ffffff", color: "#1c1e21", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Batal</button>
                <button onClick={() => {
                  const trimmed = {
                    nama: newPatient.nama.trim(),
                    nombor_kad_pengenalan: newPatient.nombor_kad_pengenalan.trim(),
                    nombor_pendaftaran_hospital: newPatient.nombor_pendaftaran_hospital.trim(),
                    nombor_telefon: newPatient.nombor_telefon.trim(),
                    alamat: newPatient.alamat.trim(),
                    catatan: newPatient.catatan.trim(),
                  };
                  addPatientMutation.mutate({
                    nama: toTitleCase(trimmed.nama),
                    nombor_kad_pengenalan: formatMyKad(trimmed.nombor_kad_pengenalan),
                    nombor_pendaftaran_hospital: trimmed.nombor_pendaftaran_hospital.toUpperCase(),
                    nombor_telefon: formatPhone(trimmed.nombor_telefon),
                    alamat: toTitleCase(trimmed.alamat),
                    catatan: trimmed.catatan,
                  });
                  setNewPatient(trimmed);
                }} disabled={!newPatient.nama || addPatientMutation.isPending}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #1877f2, #0d5bd4)", color: "#ffffff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: (!newPatient.nama || addPatientMutation.isPending) ? 0.6 : 1 }}>
                  {addPatientMutation.isPending ? <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Menyimpan...</span> : "Simpan"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Main Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div style={{ position: "relative", borderRadius: "16px", marginBottom: "16px" }}>
          {/* Gradient border */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(24, 119, 242, 0.2), rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.1))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
          {/* Card content */}
          <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Accent bar */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, #1877f2, #7c3aed, #06b6d4, #1877f2)", backgroundSize: "200% 100%" }} />

            {/* Search + Count */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "400px" }}>
                <Search size={16} color={searchFocused ? "#1877f2" : "#9ca3af"} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Cari Pesakit..."
                  style={{ ...inputStyle, paddingLeft: "36px", ...(searchFocused ? { borderColor: "rgba(24, 119, 242, 0.4)", boxShadow: "0 0 0 3px rgba(24, 119, 242, 0.08)" } : {}) }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "10px", background: "rgba(24, 119, 242, 0.05)", border: "1px solid rgba(24, 119, 242, 0.1)", fontSize: "12px", fontWeight: 600, color: "#65676b", flexShrink: 0 }}>
                <Users size={14} color="#1877f2" />
                {data?.total || 0} pesakit
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid rgba(24, 119, 242, 0.15)", borderTopColor: "#1877f2", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan pesakit...</p>
              </div>
            ) : data?.patients.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(240, 242, 245, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  {search ? <Search size={22} color="#9ca3af" /> : <Users size={22} color="#9ca3af" />}
                </div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#65676b" }}>{search ? "Tiada pesakit dijumpai." : "Tiada pesakit berdaftar."}</p>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{search ? "Cuba tukar kata kunci carian anda." : 'Klik "Daftar Pesakit" untuk mendaftarkan pesakit baru.'}</p>
              </div>
            ) : (
              <>
                {/* Desktop Header */}
                <div style={{ display: "none", gridTemplateColumns: "3fr 3fr 3fr 2fr 1fr", gap: "12px", padding: "10px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", background: "linear-gradient(90deg, rgba(240, 242, 245, 0.6), rgba(240, 242, 245, 0.2))", fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em" }} className="pesakit-table-header">
                  <div onClick={() => toggleSort("nama")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><User size={12} /> Nama <SortIcon columnKey="nama" /></div>
                  <div onClick={() => toggleSort("nombor_kad_pengenalan")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><IdCard size={12} /> No. Kad Pengenalan <SortIcon columnKey="nombor_kad_pengenalan" /></div>
                  <div onClick={() => toggleSort("nombor_pendaftaran_hospital")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><Activity size={12} /> No. Pendaftaran Hospital <SortIcon columnKey="nombor_pendaftaran_hospital" /></div>
                  <div onClick={() => toggleSort("nombor_telefon")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={12} /> No. Telefon <SortIcon columnKey="nombor_telefon" /></div>
                  <div style={{ textAlign: "center" }}>Tindakan</div>
                </div>

                {/* Rows */}
                {(data?.patients || []).map((patient, idx) => (
                  <motion.div key={patient.id} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015, duration: 0.2 }}>
                    {/* Desktop */}
                      <div className="pesakit-desktop-row" onClick={() => { setNavSource("pesakit"); router.push(`/pesakit/${patient.id}`); }}
                      style={{ display: "none", gridTemplateColumns: "3fr 3fr 3fr 2fr 1fr", gap: "12px", padding: "14px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.3)", cursor: "pointer", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(24, 119, 242, 0.03)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg, rgba(24,119,242,0.1), rgba(24,119,242,0.05))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={14} color="#1877f2" /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#1c1e21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patient.nama}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", color: "#1c1e21", display: "flex", alignItems: "center" }}>{patient.nombor_kad_pengenalan || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>}</div>
                      <div style={{ fontSize: "13px", color: "#1c1e21", display: "flex", alignItems: "center" }}>{patient.nombor_pendaftaran_hospital || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>}</div>
                      <div style={{ fontSize: "13px", color: "#1c1e21", display: "flex", alignItems: "center" }}>{patient.nombor_telefon || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>}</div>
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <ArrowRight size={14} color="#9ca3af" />
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="pesakit-mobile-row" onClick={() => { setNavSource("pesakit"); router.push(`/pesakit/${patient.id}`); }}
                      style={{ padding: "14px 20px", borderBottom: "1px solid rgba(221, 223, 226, 0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(24, 119, 242, 0.03)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, rgba(24,119,242,0.1), rgba(24,119,242,0.05))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={16} color="#1877f2" /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#1c1e21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patient.nama}</div>
                        <div style={{ fontSize: "12px", color: "#65676b", display: "flex", gap: "12px", marginTop: "2px" }}>
                          {patient.nombor_kad_pengenalan && <span>{patient.nombor_kad_pengenalan}</span>}
                          {patient.nombor_telefon && <span>{patient.nombor_telefon}</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid rgba(221, 223, 226, 0.5)", background: "rgba(240, 242, 245, 0.2)" }}>
                    <p style={{ fontSize: "12px", color: "#65676b" }}>Halaman {page + 1} daripada {totalPages} ({data?.total || 0} pesakit)</p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #dddfe2", background: "#ffffff", color: "#1c1e21", cursor: page === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum = i;
                        if (totalPages > 7) {
                          if (page < 3) pageNum = i;
                          else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                          else pageNum = page - 3 + i;
                        }
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)}
                            style={{ minWidth: "32px", height: "32px", borderRadius: "8px", border: pageNum === page ? "none" : "1px solid #dddfe2", background: pageNum === page ? "linear-gradient(135deg, #1877f2, #0d5bd4)" : "#ffffff", color: pageNum === page ? "#ffffff" : "#1c1e21", fontSize: "12px", fontWeight: pageNum === page ? 600 : 400, cursor: "pointer", padding: "0 8px" }}>
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
        @media (min-width: 640px) {
          .pesakit-table-header { display: grid !important; }
          .pesakit-desktop-row { display: grid !important; }
          .pesakit-mobile-row { display: none !important; }
        }
        @media (max-width: 639px) {
          .pesakit-desktop-row { display: none !important; }
          .pesakit-mobile-row { display: flex !important; }
        }
      `}</style>
    </div>
  );
}