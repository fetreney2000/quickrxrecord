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
    <div style={{
      minHeight: "100vh",
      background: "#f0f2f5",
    }}>
      <Sidebar />
      <div style={{
        marginLeft: "256px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative" as const,
      }}>
        <Header />
        <main style={{
          flex: 1,
          padding: "24px",
        }}>
          {children}
        </main>
      </div>
      <MobileNav />

      <style>{`
        @media (max-width: 768px) {
          .dashboard-main-area { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}