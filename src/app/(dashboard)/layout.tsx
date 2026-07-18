"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}>
        <Loader2 size={32} color="#1877f2" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`
          @-webkit-keyframes spin { from { -webkit-transform: rotate(0deg); } to { -webkit-transform: rotate(360deg); } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      {/* Animated content background orbs */}
      <div style={{ position: "fixed", top: 0, left: "256px", right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", top: "10%", right: "5%", background: "radial-gradient(circle, rgba(24,119,242,0.04) 0%, transparent 70%)", filter: "blur(60px)", animation: "contentOrb1 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: "350px", height: "350px", borderRadius: "50%", bottom: "15%", left: "10%", background: "radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 70%)", filter: "blur(60px)", animation: "contentOrb2 25s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", top: "50%", left: "40%", background: "radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)", filter: "blur(50px)", animation: "contentOrb3 18s ease-in-out infinite" }} />
      </div>
      <Sidebar />
      <div className="dashboard-content-area" style={contentStyle}>
        <Header />
        <main style={{ flex: 1, padding: "24px", minWidth: 0, position: "relative", zIndex: 1 }}>
          {children}
        </main>
      </div>
      <MobileNav />

      <style>{`
        @-webkit-keyframes contentOrb1 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(-30px, 20px); transform: translate(-30px, 20px); } }
        @keyframes contentOrb1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 20px); } }
        @-webkit-keyframes contentOrb2 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(25px, -15px); transform: translate(25px, -15px); } }
        @keyframes contentOrb2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(25px, -15px); } }
        @-webkit-keyframes contentOrb3 { 0%, 100% { -webkit-transform: translate(0, 0); transform: translate(0, 0); } 50% { -webkit-transform: translate(-20px, -25px); transform: translate(-20px, -25px); } }
        @keyframes contentOrb3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, -25px); } }
        @media (max-width: 768px) {
          .dashboard-content-area {
            margin-left: 0 !important;
            padding: 16px 12px !important;
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  );
}

const contentStyle: React.CSSProperties = {
  marginLeft: "256px",
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  position: "relative",
};