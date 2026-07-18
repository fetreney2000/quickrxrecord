"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { ArrowLeft, User, Phone, Mail, Shield, Activity } from "lucide-react";

export default function HakciptaPage() {
  const router = useRouter();

  return (
    <div style={{ position: "relative", maxWidth: "640px" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244, 63, 94, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: "20px" }}>
        <Breadcrumb items={[{ label: "Papan Pemuka", href: "/" }, { label: "Hak Cipta" }]} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
        <button onClick={() => router.back()} style={{ width: "44px", height: "44px", borderRadius: "12px", border: "1.5px solid rgba(244, 63, 94, 0.15)", background: "rgba(244, 63, 94, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0 }}>
          <ArrowLeft size={20} color="#e11d48" />
        </button>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21" }}>Hak Cipta</h1>
          <p style={{ fontSize: "13px", color: "#65676b" }}>Maklumat pembangun sistem</p>
        </div>
      </motion.div>

      {/* Developer Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div style={{ position: "relative", borderRadius: "16px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(24, 119, 242, 0.15), rgba(124, 58, 237, 0.1))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
          <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #e11d48, #1877f2, #7c3aed, #e11d48)", backgroundSize: "200% 100%" }} />

            {/* Profile Header */}
            <div style={{ padding: "24px 24px 16px", display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #1877f2, #0d5bd4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(24, 119, 242, 0.3)", flexShrink: 0 }}>
                <User size={28} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1c1e21" }}>Pembangun Sistem</h2>
                <p style={{ fontSize: "13px", color: "#65676b" }}>QuickRxRecord v4.0</p>
              </div>
            </div>

            {/* Developer Info */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "12px", background: "rgba(24, 119, 242, 0.03)", border: "1px solid rgba(24, 119, 242, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <Shield size={16} color="#1877f2" />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#1c1e21" }}>Ahmad Fetre Bin Mohammad Zime</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={14} color="#22c55e" />
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>Nama</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1c1e21" }}>Ahmad Fetre Bin Mohammad Zime</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Phone size={14} color="#22c55e" />
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>No. Telefon</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1c1e21" }}>016-881 3920</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mail size={14} color="#22c55e" />
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>Email</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1c1e21" }}>fetreney2000@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center", padding: "12px", borderRadius: "12px", background: "rgba(240, 242, 245, 0.5)" }}>
                <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                  &copy; {new Date().getFullYear()} QuickRxRecord. Hak cipta terpelihara.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}