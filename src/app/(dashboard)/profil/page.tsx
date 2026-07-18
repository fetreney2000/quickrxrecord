"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, KeyRound, Shield, Save, Activity, RefreshCw } from "lucide-react";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(profile ? { nama: profile.nama, jawatan: profile.jawatan || "", nama_pengguna: profile.nama_pengguna } : { nama: "", jawatan: "", nama_pengguna: "" });

  const [changingPassword, setChangingPassword] = useState(false);
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase.from("profiles").update({ nama: data.nama, jawatan: data.jawatan || null, nama_pengguna: data.nama_pengguna }).eq("id", profile?.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profil dikemaskini."); setEditing(false); refreshProfile(); queryClient.invalidateQueries({ queryKey: ["profile"] }); },
    onError: () => toast.error("Gagal mengemaskini profil."),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile?.id, currentPassword: pwd.current, newPassword: pwd.newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    },
    onSuccess: () => { toast.success("Kata laluan berjaya ditukar."); setChangingPassword(false); setPwd({ current: "", newPwd: "", confirm: "" }); },
    onError: (e: any) => toast.error(e.message || "Gagal menukar kata laluan."),
  });

  if (!profile) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "42px", padding: "0 14px", borderRadius: "10px",
    border: "1.5px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff", fontSize: "13px", fontFamily: "inherit", outline: "none",
    transition: "all 0.2s ease", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ position: "relative", maxWidth: "640px" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(34, 197, 94, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: "20px" }}>
        <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Profil" }]} />
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
        <button onClick={() => router.back()} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(34, 197, 94, 0.15)", background: "rgba(34, 197, 94, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0 }}>
          <ArrowLeft size={20} color="#22c55e" />
        </button>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21" }}>Profil Pengguna</h1>
          <p style={{ fontSize: "13px", color: "#65676b" }}>Urus maklumat peribadi anda</p>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div style={{ position: "relative", borderRadius: "16px", marginBottom: "20px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(24, 119, 242, 0.15), rgba(124, 58, 237, 0.1))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
          <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #22c55e, #1877f2, #7c3aed, #22c55e)", backgroundSize: "200% 100%" }} />
            {/* Card Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <User size={16} color="#22c55e" />
                <div>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1e21" }}>Maklumat Peribadi</span>
                  <p style={{ fontSize: "12px", color: "#65676b" }}>Kemaskini maklumat profil anda.</p>
                </div>
              </div>
              {!editing && (
                <button onClick={() => { setEditing(true); setEditData({ nama: profile.nama, jawatan: profile.jawatan || "", nama_pengguna: profile.nama_pengguna }); }}
                  style={{ padding: "7px 14px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease" }}>
                  Edit Profil
                </button>
              )}
            </div>
            {/* Content */}
            <div style={{ padding: "20px 24px" }}>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Nama</Label>
                      <Input value={editData.nama} onChange={e => setEditData({ ...editData, nama: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Nama Pengguna</Label>
                      <Input value={editData.nama_pengguna} onChange={e => setEditData({ ...editData, nama_pengguna: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Jawatan</Label>
                    <Input value={editData.jawatan} onChange={e => setEditData({ ...editData, jawatan: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button onClick={() => updateProfileMutation.mutate(editData)} disabled={updateProfileMutation.isPending}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: updateProfileMutation.isPending ? 0.7 : 1, boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)" }}>
                      {updateProfileMutation.isPending ? <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Menyimpan...</span> : <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Save size={14} /> Simpan</span>}
                    </button>
                    <button onClick={() => setEditing(false)} style={{ padding: "9px 18px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Batal</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { label: "Nama", value: profile.nama },
                    { label: "Nama Pengguna", value: profile.nama_pengguna, mono: true },
                    { label: "Jawatan", value: profile.jawatan || "-" },
                    { label: "Peranan", value: profile.peranan, badge: true },
                    { label: "ID Pengguna", value: profile.id, mono: true, small: true, full: true },
                  ].map(field => (
                    <div key={field.label} style={field.full ? { gridColumn: "1 / -1" } : undefined}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{field.label}</p>
                      {field.badge ? (
                        <Badge variant="outline" style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)" }}>{field.value}</Badge>
                      ) : (
                        <p style={{ fontSize: field.small ? "11px" : "14px", fontFamily: field.mono ? "monospace" : "inherit", color: field.small ? "#9ca3af" : "#1c1e21", fontWeight: 500, wordBreak: "break-all" }}>{field.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Change Password Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
        <div style={{ position: "relative", borderRadius: "16px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.1), rgba(124, 58, 237, 0.08))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
          <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #f59e0b, #ef4444, #7c3aed, #f59e0b)", backgroundSize: "200% 100%" }} />
            {/* Card Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Lock size={16} color="#f59e0b" />
              <div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1e21" }}>Tukar Kata Laluan</span>
                <p style={{ fontSize: "12px", color: "#65676b" }}>Tukar kata laluan anda sendiri.</p>
              </div>
            </div>
            {/* Content */}
            <div style={{ padding: "20px 24px" }}>
              {changingPassword ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Kata Laluan Semasa</Label>
                    <Input type="password" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Kata Laluan Baharu</Label>
                    <Input type="password" value={pwd.newPwd} onChange={e => setPwd({ ...pwd, newPwd: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <Label style={{ fontSize: "12px", fontWeight: 600, color: "#65676b", marginBottom: "6px", display: "block" }}>Sahkan Kata Laluan Baharu</Label>
                    <Input type="password" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      onClick={() => {
                        if (pwd.newPwd !== pwd.confirm) { toast.error("Kata laluan baharu tidak sepadan."); return; }
                        if (pwd.newPwd.length < 6) { toast.error("Kata laluan baharu mesti sekurang-kurangnya 6 aksara."); return; }
                        changePasswordMutation.mutate();
                      }}
                      disabled={changePasswordMutation.isPending}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: changePasswordMutation.isPending ? 0.7 : 1, boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)" }}>
                      {changePasswordMutation.isPending ? <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Menukar...</span> : "Tukar Kata Laluan"}
                    </button>
                    <button onClick={() => { setChangingPassword(false); setPwd({ current: "", newPwd: "", confirm: "" }); }} style={{ padding: "9px 18px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Batal</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChangingPassword(true)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease" }}>
                  <KeyRound size={16} /> Tukar Kata Laluan
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @-webkit-keyframes spin { from { -webkit-transform: rotate(0deg); } to { -webkit-transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}