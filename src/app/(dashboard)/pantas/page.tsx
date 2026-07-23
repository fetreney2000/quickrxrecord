"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth, hasPermission } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  Zap, Search, Loader2, User, ChevronDown, Package, X, Pill, CheckCircle2, ArrowRight,
  Hash, Calendar, Clock, MessageSquare, Plus, ListPlus
} from "lucide-react";
import type { Patient, Item, ItemBatch, ItemForm } from "@/types";

const FREQUENT_ITEM_COUNT = 10;

export default function QuickDispensePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const canSupply = hasPermission(profile?.peranan, "manage_supply");
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dose, setDose] = useState("");
  const [tempohNilai, setTempohNilai] = useState("");
  const [tempohUnit, setTempohUnit] = useState("Hari");
  const [catatan, setCatatan] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successPatient, setSuccessPatient] = useState<string | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerItemSearch, setRegisterItemSearch] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!canSupply) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#1c1e21", marginBottom: "4px" }}>Akses Terhad</p>
          <p style={{ fontSize: "13px", color: "#65676b" }}>Anda tiada kebenaran untuk mendispens.</p>
        </div>
      </div>
    );
  }

  // Patient search (debounced)
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("patients")
      .select("id, nama, nombor_kad_pengenalan, nombor_pendaftaran_hospital, nombor_telefon")
      .or(`nama.ilike.%${query}%,nombor_kad_pengenalan.ilike.%${query}%,nombor_pendaftaran_hospital.ilike.%${query}%`)
      .eq("aktif", true).is("merged_into", null).limit(10);
    setSearchResults((data as Patient[]) || []);
    setSearching(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => { searchPatients(searchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  // Items (all active, for register dialog)
  const { data: items } = useQuery({
    queryKey: ["items-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, kod_item, nama_item, kekuatan, id_bentuk").eq("aktif", true).order("nama_item");
      if (error) throw error;
      return data as any[];
    }
  });

  // Patient's active assignments (with item details)
  const { data: patientAssignments } = useQuery({
    queryKey: ["patient-assignments", selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data, error } = await supabase
        .from("patient_item_assignments")
        .select("id, item_id, dos, item:items(id, kod_item, nama_item, kekuatan, id_bentuk)")
        .eq("patient_id", selectedPatient.id)
        .eq("aktif", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPatient,
  });

  const assignedItems = useMemo(() => {
    if (!patientAssignments) return [];
    return patientAssignments.map((a: any) => ({
      ...a.item,
      assignment_id: a.id,
      assignment_dos: a.dos,
    }));
  }, [patientAssignments]);

  const assignedItemIds = useMemo(() => {
    return new Set(assignedItems.map((i: any) => i.id));
  }, [assignedItems]);

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

  const getItemDisplayName = useCallback((item: any) => {
    if (!item) return "";
    const f = formsMap.get(item.id_bentuk) || "";
    return [item.nama_item, item.kekuatan, f].filter(Boolean).join(" ");
  }, [formsMap]);

  // Frequent items (top dispensed)
  const { data: frequentItems } = useQuery({
    queryKey: ["frequent-items"],
    queryFn: async () => {
      const { data: supplyData, error } = await supabase
        .from("supply_records")
        .select("assignment_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error || !supplyData) return [];
      const assignmentIds = [...new Set(supplyData.map((s: any) => s.assignment_id))];
      if (assignmentIds.length === 0) return [];
      const { data: assignments } = await supabase
        .from("patient_item_assignments")
        .select("item_id")
        .in("id", assignmentIds);
      if (!assignments) return [];
      const counts: Record<string, number> = {};
      assignments.forEach((a: any) => { counts[a.item_id] = (counts[a.item_id] || 0) + 1; });
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, FREQUENT_ITEM_COUNT)
        .map(([itemId]) => itemId);
    },
    staleTime: 300000,
  });

  const frequentItemData = useMemo(() => {
    if (!frequentItems || !items) return [];
    const itemMap = new Map(items.map((i: any) => [i.id, i]));
    return frequentItems
      .filter(id => assignedItemIds.has(id))
      .map(id => itemMap.get(id))
      .filter(Boolean) as any[];
  }, [frequentItems, items, assignedItemIds]);

  // Availaible batches for selected item (FEFO sorted)
  const { data: availableBatches } = useQuery({
    queryKey: ["pantas-batches", selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem?.id) return [];
      const { data, error } = await supabase
        .from("item_batches")
        .select("*")
        .eq("item_id", selectedItem.id)
        .gt("kuantiti", 0)
        .gte("tarikh_luput", new Date().toISOString().split("T")[0])
        .order("tarikh_luput", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ItemBatch[];
    },
    enabled: !!selectedItem,
  });

  // Auto-select first batch (FEFO)
  useEffect(() => {
    if (availableBatches && availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0].id);
    } else {
      setSelectedBatchId("");
    }
  }, [availableBatches]);

  // Durations
  const { data: durations } = useQuery({
    queryKey: ["supply_durations"],
    queryFn: async () => {
      const { data } = await supabase.from("supply_durations").select("*").order("nama");
      return (data || []) as { nama: string }[];
    },
    staleTime: 300000,
  });

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowRegisterDialog(false);
    setRegisterItemSearch("");
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setSelectedItem(null);
    setItemSearch("");
    setQuantity("");
    setDose("");
    setTempohNilai("");
    setTempohUnit("Hari");
    setCatatan("");
    setSelectedBatchId("");
    setShowRegisterDialog(false);
    setRegisterItemSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const clearForm = () => {
    setSelectedItem(null);
    setItemSearch("");
    setQuantity("");
    setDose("");
    setTempohNilai("");
    setTempohUnit("Hari");
    setCatatan("");
  };

  const handleSelectAssignedItem = (item: any) => {
    setSelectedItem(item);
    if (item.assignment_dos) {
      setDose(item.assignment_dos);
    }
  };

  const handleRegisterItem = (item: any) => {
    setSelectedItem(item);
    setShowRegisterDialog(false);
    setRegisterItemSearch("");
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedItem || !quantity.trim() || !selectedBatchId || !dose.trim()) return;
    setSubmitting(true);
    try {
      // Use existing assignment_id if available, otherwise find/create
      let assignmentId: string = selectedItem.assignment_id || "";

      if (!assignmentId) {
        const { data: existingAssignments } = await supabase
          .from("patient_item_assignments")
          .select("id")
          .eq("patient_id", selectedPatient.id)
          .eq("item_id", selectedItem.id)
          .eq("aktif", true)
          .limit(1);

        if (existingAssignments && existingAssignments.length > 0) {
          assignmentId = existingAssignments[0].id;
        } else {
          const today = new Date().toISOString().split("T")[0];
          const { data: newAssignment, error: assignError } = await supabase
            .from("patient_item_assignments")
            .insert({
              patient_id: selectedPatient.id,
              item_id: selectedItem.id,
              dos: dose.trim().toUpperCase(),
              tarikh_mula_guna: today,
              dimulakan_oleh: profile?.id,
              kakitangan_farmasi_perekod: profile?.id,
            })
            .select("id");

          if (assignError) throw assignError;
          assignmentId = newAssignment![0].id;

          await supabase.from("dose_history").insert({
            assignment_id: assignmentId,
            tarikh: today,
            dos: dose.trim().toUpperCase(),
            aktif: true,
            dikemaskini_oleh: profile?.id,
            catatan: "Bekalan kali pertama (Dispens Pantas)",
          });
        }
      }

      // 2. Call supply API
      const res = await fetch("/api/supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          dos: dose.trim().toUpperCase(),
          tempoh_dibekal: tempohNilai.trim() ? `${tempohNilai.trim()} ${tempohUnit}` : null,
          kuantiti: quantity.trim(),
          batch_id: selectedBatchId,
          kakitangan_pembekal: profile?.id,
          catatan_bekalan: catatan.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memproses bekalan.");
      }

      const result = await res.json();
      toast.success("Bekalan direkodkan!", {
        description: `${selectedItem.nama_item} ${selectedItem.kekuatan || ""} — ${quantity} unit`,
      });

      setSuccessPatient(selectedPatient.nama);
      queryClient.invalidateQueries({ queryKey: ["patient-assignments", selectedPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["frequent-items"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["pantas-batches"] });
      queryClient.invalidateQueries({ queryKey: ["items-active"] });

      // Clear form, keep patient
      clearForm();

      setTimeout(() => setSuccessPatient(null), 2500);
    } catch (e: any) {
      toast.error(e.message || "Gagal mendispens.");
    }
    setSubmitting(false);
  };

  const filteredAssignedItems = useMemo(() => {
    if (!assignedItems) return [];
    if (!itemSearch.trim()) return assignedItems;
    const q = itemSearch.toLowerCase();
    return assignedItems.filter((i: any) =>
      (i.nama_item && i.nama_item.toLowerCase().includes(q)) ||
      (i.kod_item && i.kod_item.toLowerCase().includes(q)) ||
      (i.kekuatan && i.kekuatan.toLowerCase().includes(q))
    );
  }, [assignedItems, itemSearch]);

  const filteredRegisterItems = useMemo(() => {
    if (!items) return [];
    const availableItems = items.filter((i: any) => !assignedItemIds.has(i.id));
    if (!registerItemSearch.trim()) return availableItems;
    const q = registerItemSearch.toLowerCase();
    return availableItems.filter((i: any) =>
      i.nama_item.toLowerCase().includes(q) ||
      i.kod_item.toLowerCase().includes(q) ||
      (i.kekuatan && i.kekuatan.toLowerCase().includes(q))
    );
  }, [items, assignedItemIds, registerItemSearch]);

  const selectedBatch = useMemo(() => {
    if (!availableBatches || !selectedBatchId) return null;
    return availableBatches.find((b: ItemBatch) => b.id === selectedBatchId) || null;
  }, [availableBatches, selectedBatchId]);

  return (
    <div className="dispens-pantas" style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(240, 147, 43, 0.04) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #f0932b, #e07a1f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(240, 147, 43, 0.3)" }}>
          <Zap size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Dispens Pantas</h1>
          <p style={{ fontSize: "12px", color: "#65676b", marginTop: "2px" }}>Cari pesakit &middot; Pilih ubat &middot; Bekal</p>
        </div>
      </motion.div>

      {/* Success feedback */}
      <AnimatePresence>
        {successPatient && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 16px", borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#065f46" }}>Bekalan direkodkan untuk {successPatient}</p>
              <p style={{ fontSize: "11px", color: "#059669" }}>Sedia untuk pendispensan seterusnya.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Search / Patient Card */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.02 }}>
        {!selectedPatient ? (
          <div style={{
            borderRadius: "16px", border: "2px solid rgba(240, 147, 43, 0.2)", background: "rgba(240, 147, 43, 0.03)",
            padding: isMobile ? "24px 16px" : "32px 24px",
            boxShadow: "0 4px 16px rgba(240, 147, 43, 0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(240, 147, 43, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={24} color="#e07a1f" />
              </div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#1c1e21" }}>Cari Pesakit</p>
                <p style={{ fontSize: "12px", color: "#65676b" }}>Taip nama, No. KP, atau No. Pendaftaran Hospital</p>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex", alignItems: "center", height: "52px", borderRadius: "14px",
                border: focused ? "1.5px solid rgba(240, 147, 43, 0.5)" : "1.5px solid rgba(240, 147, 43, 0.2)",
                background: focused ? "#ffffff" : "rgba(240, 147, 43, 0.04)",
                boxShadow: focused ? "0 0 0 4px rgba(240, 147, 43, 0.08), 0 4px 16px rgba(240, 147, 43, 0.06)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", flexShrink: 0 }}>
                  <Search size={18} color={focused ? "#e07a1f" : "#9ca3af"} />
                </div>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Cari pesakit..."
                  style={{
                    flex: 1, height: "100%", border: "none", background: "transparent", outline: "none",
                    fontSize: "14px", fontWeight: 500, color: "#1c1e21", fontFamily: "inherit", paddingRight: "12px",
                  }}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onFocus={() => { setFocused(true); setShowResults(true); }}
                  onBlur={() => { setFocused(false); setTimeout(() => setShowResults(false), 200); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0) {
                      handleSelectPatient(searchResults[0]);
                    }
                  }}
                />
                {searching && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", flexShrink: 0 }}>
                    <Loader2 size={16} color="#e07a1f" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>

              {showResults && searchResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                  background: "#ffffff", border: "1px solid rgba(240, 147, 43, 0.12)",
                  borderRadius: "14px", boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)",
                  maxHeight: "320px", overflowY: "auto", zIndex: 50,
                }}>
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      style={{
                        width: "100%", textAlign: "left", padding: "14px 16px", background: "transparent",
                        border: "none", borderBottom: "1px solid rgba(240, 147, 43, 0.06)", cursor: "pointer",
                        transition: "background 0.15s ease", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px",
                      }}
                      onMouseDown={() => handleSelectPatient(patient)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240, 147, 43, 0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(240, 147, 43, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User size={16} color="#e07a1f" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1c1e21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patient.nama}</div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                          {patient.nombor_kad_pengenalan && <span style={{ fontSize: "11px", color: "#65676b" }}>KP: {patient.nombor_kad_pengenalan}</span>}
                          {patient.nombor_pendaftaran_hospital && <span style={{ fontSize: "11px", color: "#65676b" }}>Hosp: {patient.nombor_pendaftaran_hospital}</span>}
                        </div>
                      </div>
                      <ArrowRight size={14} color="#d1d5db" style={{ marginLeft: "auto", flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showResults && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <p style={{ fontSize: "12px", color: "#65676b", textAlign: "center", marginTop: "16px" }}>Tiada pesakit dijumpai. Cuba ejaan lain.</p>
            )}
          </div>
        ) : (
          /* Patient Selected - Dispensing Form */
          <div>
            {/* Patient Card */}
            <div style={{
              borderRadius: "16px", border: "1px solid rgba(16, 185, 129, 0.25)", background: "rgba(16, 185, 129, 0.04)",
              padding: isMobile ? "14px" : "18px 20px", marginBottom: "16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
                  <User size={22} color="white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c1e21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedPatient.nama}</div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "1px" }}>
                    {selectedPatient.nombor_kad_pengenalan && <span style={{ fontSize: "11px", color: "#65676b" }}>KP: {selectedPatient.nombor_kad_pengenalan}</span>}
                    {selectedPatient.nombor_pendaftaran_hospital && <span style={{ fontSize: "11px", color: "#65676b" }}>Hosp: {selectedPatient.nombor_pendaftaran_hospital}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/pesakit/${selectedPatient.id}`)} style={{ fontSize: "11px" }}>
                  Butiran
                </Button>
                <Button variant="outline" size="sm" onClick={clearPatient} style={{ fontSize: "11px" }}>
                  <X size={14} style={{ marginRight: "4px" }} /> Tukar
                </Button>
              </div>
            </div>

            {/* Item Selection — only assigned items */}
            {!selectedItem ? (
              <div style={{
                borderRadius: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", background: "#ffffff",
                padding: isMobile ? "16px" : "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Pill size={20} color="#1877f2" />
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#1c1e21" }}>Pilih Ubat</p>
                  <Badge variant="secondary" style={{ fontSize: "10px", marginLeft: "4px" }}>{assignedItems.length} didaftarkan</Badge>
                </div>

                {/* Frequent Items (from patient's assigned items) */}
                {frequentItemData.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#65676b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Item Kerap</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {frequentItemData.map((item: any) => {
                        const assigned = assignedItems.find((a: any) => a.id === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectAssignedItem(assigned || item)}
                            style={{
                              padding: "8px 14px", borderRadius: "10px",
                              border: "1px solid rgba(24, 119, 242, 0.15)", background: "rgba(24, 119, 242, 0.04)",
                              cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "#1877f2",
                              fontFamily: "inherit", transition: "all 0.15s ease",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(24, 119, 242, 0.1)"; e.currentTarget.style.borderColor = "rgba(24, 119, 242, 0.3)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(24, 119, 242, 0.04)"; e.currentTarget.style.borderColor = "rgba(24, 119, 242, 0.15)"; }}
                          >
                            {item.nama_item} {item.kekuatan && <span style={{ fontSize: "11px", opacity: 0.7 }}>{item.kekuatan}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search assigned items */}
                <div style={{ position: "relative", marginBottom: assignedItems.length > 8 ? "0" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(24, 119, 242, 0.15)", background: "rgba(24, 119, 242, 0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", flexShrink: 0 }}>
                      <Search size={16} color="#9ca3af" />
                    </div>
                    <input
                      type="search"
                      placeholder="Cari dalam item didaftarkan..."
                      style={{
                        flex: 1, height: "100%", border: "none", background: "transparent", outline: "none",
                        fontSize: "13px", color: "#1c1e21", fontFamily: "inherit", paddingRight: "12px",
                      }}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Assigned Items List */}
                <div style={{ maxHeight: "280px", overflowY: "auto", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.06)", marginTop: "12px" }}>
                  {filteredAssignedItems.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#65676b", textAlign: "center", padding: "16px" }}>
                      {assignedItems.length === 0 ? "Pesakit ini belum mempunyai sebarang item didaftarkan." : "Tiada padanan."}
                    </p>
                  ) : filteredAssignedItems.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAssignedItem(item)}
                      style={{
                        padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer",
                        transition: "background 0.1s ease", background: "transparent",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(24, 119, 242, 0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#1c1e21" }}>{getItemDisplayName(item)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                        <span style={{ fontSize: "11px", color: "#65676b" }}>{item.kod_item}</span>
                        {item.assignment_dos && (
                          <span style={{ fontSize: "11px", color: "#1877f2", fontWeight: 500 }}>Dos: {item.assignment_dos}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Daftar Item Baru */}
                <div style={{
                  marginTop: "14px", padding: "12px 14px", borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.04)", border: "1px dashed rgba(16, 185, 129, 0.25)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#065f46" }}>Item tidak tersenarai?</p>
                    <p style={{ fontSize: "11px", color: "#059669" }}>Daftar item baharu untuk pesakit ini dan teruskan pendispensan.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowRegisterDialog(true)}
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: "none", borderRadius: "10px", color: "#fff",
                      fontSize: "12px", fontWeight: 600, flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    <Plus size={14} style={{ marginRight: "4px" }} /> Daftar Item
                  </Button>
                </div>
              </div>
            ) : (
              /* Dispensing Form */
              <div style={{
                borderRadius: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", background: "#ffffff",
                padding: isMobile ? "16px" : "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                {/* Item Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(24, 119, 242, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Pill size={20} color="#1877f2" />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c1e21" }}>{getItemDisplayName(selectedItem)}</div>
                      <div style={{ fontSize: "11px", color: "#65676b" }}>{selectedItem.kod_item}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearForm} style={{ fontSize: "11px" }}>
                    <X size={14} style={{ marginRight: "4px" }} /> Tukar Ubat
                  </Button>
                </div>

                {/* Batch Info (FEFO) */}
                <div style={{
                  padding: "10px 14px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.15)",
                  marginBottom: "16px", fontSize: "12px",
                }}>
                  {!availableBatches || availableBatches.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                      <X size={14} />
                      <span>Tiada kelompok tersedia untuk item ini.</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <Package size={14} color="#f59e0b" />
                        <span style={{ fontWeight: 600, color: "#92400e" }}>Kelompok Auto (FEFO)</span>
                        {availableBatches.length > 1 && (
                          <span style={{ fontSize: "11px", color: "#65676b" }}>— {availableBatches.length} kelompok tersedia</span>
                        )}
                      </div>
                      {selectedBatch && (
                        <div style={{ color: "#78350f", paddingLeft: "22px" }}>
                          <span style={{ fontWeight: 500 }}>{selectedBatch.nombor_kelompok}</span>
                          <span style={{ margin: "0 6px", color: "#d1d5db" }}>|</span>
                          <span>Luput: {formatDate(selectedBatch.tarikh_luput)}</span>
                          <span style={{ margin: "0 6px", color: "#d1d5db" }}>|</span>
                          <span>Stok: {selectedBatch.kuantiti}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Form Fields */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
                  <div className="space-y-2">
                    <Label style={{ fontSize: "12px", color: "#65676b" }}>Dos</Label>
                    <Input
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      onBlur={(e) => setDose(e.target.value.trim().toUpperCase())}
                      placeholder="cth: 1 BIJI SEHARI"
                      style={{ height: "42px", fontSize: "13px" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontSize: "12px", color: "#65676b" }}>Kuantiti</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{ height: "42px", fontSize: "13px" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontSize: "12px", color: "#65676b" }}>Tempoh Dibekal</Label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Input
                        type="number"
                        value={tempohNilai}
                        onChange={(e) => setTempohNilai(e.target.value)}
                        placeholder="30"
                        style={{ height: "42px", fontSize: "13px", flex: 1 }}
                      />
                      <Select value={tempohUnit} onValueChange={setTempohUnit}>
                        <SelectTrigger style={{ height: "42px", fontSize: "13px", width: "110px" }}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(durations || []).map(d => (
                            <SelectItem key={d.nama} value={d.nama}>{d.nama}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontSize: "12px", color: "#65676b" }}>Catatan</Label>
                    <Input
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="(pilihan)"
                      style={{ height: "42px", fontSize: "13px" }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                  <Button
                    onClick={handleSubmit}
                    disabled={!quantity.trim() || !dose.trim() || !selectedBatchId || submitting}
                    style={{
                      flex: 1, height: "48px", fontSize: "14px", fontWeight: 700,
                      background: submitting ? "rgba(24, 119, 242, 0.5)" : "linear-gradient(135deg, #1877f2, #0d5bd4)",
                      border: "none", borderRadius: "12px", boxShadow: "0 4px 14px rgba(24, 119, 242, 0.3)",
                      color: "#ffffff", cursor: submitting ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Membekal...
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <Zap size={18} /> Bekal {quantity ? `(${quantity})` : ""}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Daftar Item Baru Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={(v) => { setShowRegisterDialog(v); if (!v) setRegisterItemSearch(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Daftar Item Baharu
            </DialogTitle>
            <DialogDescription>
              Pilih item untuk didaftarkan kepada <strong>{selectedPatient?.nama}</strong>. Item akan didaftarkan dan anda boleh terus mendispens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(16, 185, 129, 0.2)", background: "rgba(16, 185, 129, 0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", flexShrink: 0 }}>
                  <Search size={16} color="#9ca3af" />
                </div>
                <input
                  type="search"
                  placeholder="Cari ubat untuk didaftarkan..."
                  style={{
                    flex: 1, height: "100%", border: "none", background: "transparent", outline: "none",
                    fontSize: "13px", color: "#1c1e21", fontFamily: "inherit", paddingRight: "12px",
                  }}
                  value={registerItemSearch}
                  onChange={(e) => setRegisterItemSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ maxHeight: "280px", overflowY: "auto", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.06)" }}>
              {filteredRegisterItems.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#65676b", textAlign: "center", padding: "16px" }}>Tiada item tersedia.</p>
              ) : filteredRegisterItems.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleRegisterItem(item)}
                  style={{
                    padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer",
                    transition: "background 0.1s ease", background: "transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#1c1e21" }}>{getItemDisplayName(item)}</div>
                  <div style={{ fontSize: "11px", color: "#65676b", marginTop: "1px" }}>{item.kod_item}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRegisterDialog(false); setRegisterItemSearch(""); }}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @-webkit-keyframes spin { from { -webkit-transform: rotate(0deg); transform: rotate(0deg); } to { -webkit-transform: rotate(360deg); transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration { -webkit-appearance: none; }
        @media (max-width: 768px) {
          .dispens-pantas { padding: 0 4px; }
        }
      `}</style>
    </div>
  );
}
