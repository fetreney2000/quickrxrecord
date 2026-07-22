"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, BarChart3, Package, Activity } from "lucide-react";
import { toast } from "sonner";

export default function LaporanPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"inventory" | "transactions">("inventory");

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["report-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*, item_batches(*)").eq("aktif", true).order("nama_item");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["report-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supply_records")
        .select("*, assignment:patient_item_assignments(patient:patients(nama), item:items(nama_item, kekuatan)), batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const exportToExcel = async (data: any[], filename: string, columnLabels?: Record<string, string>) => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      wb.creator = "QuickRxRecord";
      wb.created = new Date();
      const ws = wb.addWorksheet(filename.replace(/_/g, " "));
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const labels = keys.map(k => columnLabels?.[k] || k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
        // Title row
        ws.mergeCells(1, 1, 1, keys.length);
        const titleCell = ws.getCell("A1");
        titleCell.value = filename.replace(/_/g, " ");
        titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1877F2" } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(1).height = 36;
        // Date row
        ws.mergeCells(2, 1, 2, keys.length);
        const dateCell = ws.getCell("A2");
        dateCell.value = `Dijana pada: ${new Date().toLocaleString("ms-MY")}`;
        dateCell.font = { size: 10, italic: true, color: { argb: "FF65676B" } };
        dateCell.alignment = { horizontal: "center" };
        ws.getRow(2).height = 22;
        // Header row
        const headerRow = ws.addRow(labels);
        headerRow.height = 28;
        headerRow.eachCell((cell) => {
          cell.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
        });
        // Data rows
        data.forEach((row, idx) => {
          const r = ws.addRow(keys.map(k => String(row[k] ?? "")));
          r.height = 20;
          r.eachCell((cell) => {
            cell.font = { size: 10 };
            cell.alignment = { vertical: "middle" };
            cell.border = { bottom: { style: "thin", color: { argb: "FFF3F4F6" } } };
            if (idx % 2 === 0) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
            }
          });
        });
        // Auto column widths
        keys.forEach((k, i) => {
          const maxLen = Math.max(labels[i].length, ...data.map(r => String(r[k] ?? "").length));
          ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 12), 40);
        });
        // Footer row
        const footerRow = ws.addRow([]);
        ws.addRow(["", `Jumlah rekod: ${data.length}`, ...Array(keys.length - 2).fill("")]);
      }
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${filename}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Fail Excel berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport fail Excel."); }
  };

  const exportToPDF = async (data: any[], filename: string, columnLabels?: Record<string, string>) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF("landscape");
      // Header bar
      doc.setFillColor(24, 119, 242);
      doc.rect(0, 0, 300, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("QuickRxRecord", 14, 14);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(filename.replace(/_/g, " "), 14, 24);
      // Date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Dijana pada: ${new Date().toLocaleString("ms-MY")}`, 14, 40);
      doc.text(`Jumlah rekod: ${data.length}`, 200, 40);
      // Table
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const labels = keys.map(k => columnLabels?.[k] || k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
        const rows = data.map(row => keys.map(k => String(row[k] ?? "")));
        autoTable(doc, {
          head: [labels],
          body: rows,
          startY: 46,
          styles: { fontSize: 8, cellPadding: 3, lineColor: [229, 231, 235], lineWidth: 0.3 },
          headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 14, right: 14 },
        });
      }
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`QuickRxRecord - ${filename.replace(/_/g, " ")}`, 14, doc.internal.pageSize.height - 8);
        doc.text(`Halaman ${i} / ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
      }
      doc.save(`${filename}.pdf`);
      toast.success("Fail PDF berjaya dimuat turun.");
    } catch { toast.error("Gagal mengeksport fail PDF."); }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244, 63, 94, 0.03) 0%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }} style={{ marginBottom: "20px" }}>
        <Breadcrumb items={[{ label: "Laporan" }]} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.02 }}
        style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #f43f5e, #e11d48)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(244, 63, 94, 0.3)", flexShrink: 0 }}>
          <BarChart3 size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1c1e21", letterSpacing: "-0.01em" }}>Laporan</h1>
          <p style={{ fontSize: "13px", color: "#65676b", fontWeight: 500 }}>Laporan inventori dan transaksi</p>
        </div>
      </motion.div>

      {/* Tab switcher */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.01 }}
        style={{ display: "flex", gap: "4px", padding: "4px", borderRadius: "14px", background: "rgba(240, 242, 245, 0.8)", border: "1px solid rgba(221, 223, 226, 0.5)", marginBottom: "24px", width: "fit-content" }}>
        {[
          { key: "inventory" as const, label: "Inventori", icon: Package },
          { key: "transactions" as const, label: "Transaksi", icon: Activity },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px",
              borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease",
              ...(activeTab === tab.key
                ? { background: "#ffffff", color: "#1c1e21", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: "#65676b" }),
            }}>
          <tab.icon size={14} />
          {tab.label}
        </button>
        ))}
      </motion.div>

      {/* Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}>
        {activeTab === "inventory" ? (
          <div style={{ position: "relative", borderRadius: "16px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(24, 119, 242, 0.1), rgba(124, 58, 237, 0.08))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
            <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ height: "3px", background: "linear-gradient(90deg, #f43f5e, #1877f2, #7c3aed, #f43f5e)", backgroundSize: "200% 100%", animation: "gradientShift 4s ease infinite" }} />
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Package size={16} color="#f43f5e" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1e21" }}>Paras Stok Inventori</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => {
                    const flatData = (inventoryData || []).flatMap((item: any) => (item.item_batches || []).map((batch: any) => ({ kod_item: item.kod_item, nama_item: item.nama_item, kekuatan: item.kekuatan, kuota: item.kuota, nombor_kelompok: batch.nombor_kelompok, tarikh_luput: batch.tarikh_luput, kuantiti: batch.kuantiti })));
                    exportToExcel(flatData, "Laporan_Inventori");
                  }} style={styles.exportBtn}><FileSpreadsheet size={14} /> Excel</button>
                  <button onClick={() => {
                    const flatData = (inventoryData || []).flatMap((item: any) => (item.item_batches || []).map((batch: any) => ({ kod_item: item.kod_item, nama_item: item.nama_item, kekuatan: item.kekuatan, nombor_kelompok: batch.nombor_kelompok, tarikh_luput: batch.tarikh_luput, kuantiti: batch.kuantiti })));
                    exportToPDF(flatData, "Laporan Inventori", { kod_item: "Kod", nama_item: "Nama Item", kekuatan: "Kekuatan", nombor_kelompok: "Kelompok", tarikh_luput: "Tarikh Luput", kuantiti: "Kuantiti" });
                  }} style={styles.exportBtn}><FileText size={14} /> PDF</button>
                </div>
              </div>
              {inventoryLoading ? (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ width: "32px", height: "32px", border: "3px solid rgba(244, 63, 94, 0.15)", borderTopColor: "#f43f5e", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan laporan...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Kod", "Nama Item", "Kekuatan", "Kuota", "Jumlah Stok", "Status"].map(h => (
                        <TableHead key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData?.map((item: any) => {
                      const totalStock = item.item_batches?.reduce((s: number, b: any) => s + b.kuantiti, 0) || 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell style={{ fontFamily: "monospace", fontSize: "13px" }}>{item.kod_item}</TableCell>
                          <TableCell style={{ fontWeight: 500, fontSize: "13px" }}>{item.nama_item}</TableCell>
                          <TableCell style={{ fontSize: "13px" }}>{item.kekuatan || "-"}</TableCell>
                          <TableCell style={{ fontSize: "13px" }}>{item.kuota ?? "-"}</TableCell>
                          <TableCell style={{ fontSize: "13px", fontWeight: 600 }}>{totalStock}</TableCell>
                          <TableCell>
                            {item.kuota && totalStock < item.kuota && (
                              <Badge variant="destructive" style={{ fontSize: "10px" }}>Stok Rendah</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", borderRadius: "16px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "16px", padding: "1px", background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(24, 119, 242, 0.1), rgba(6, 182, 212, 0.08))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
            <div style={{ borderRadius: "16px", background: "rgba(255, 255, 255, 0.85)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ height: "3px", background: "linear-gradient(90deg, #7c3aed, #1877f2, #06b6d4, #7c3aed)", backgroundSize: "200% 100%", animation: "gradientShift 4s ease infinite" }} />
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(221, 223, 226, 0.5)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Activity size={16} color="#7c3aed" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1c1e21" }}>Log Transaksi Bekalan</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => {
                    exportToExcel((transactions || []).slice(0, 500).map((t: any) => ({ tarikh: t.tarikh_dibekal, pesakit: t.assignment?.patient?.nama, item: t.assignment?.item?.nama_item, dos: t.dos, kuantiti: t.kuantiti, kelompok: t.batch?.nombor_kelompok, kakitangan: t.staff?.nama })), "Laporan_Transaksi");
                  }} style={styles.exportBtn}><FileSpreadsheet size={14} /> Excel</button>
                  <button onClick={() => {
                    exportToPDF((transactions || []).slice(0, 500).map((t: any) => ({ tarikh: t.tarikh_dibekal, pesakit: t.assignment?.patient?.nama, item: t.assignment?.item?.nama_item, dos: t.dos, kuantiti: t.kuantiti, kelompok: t.batch?.nombor_kelompok, kakitangan: t.staff?.nama })), "Laporan Transaksi", { tarikh: "Tarikh", pesakit: "Pesakit", item: "Item", dos: "Dos", kuantiti: "Kuantiti", kelompok: "Kelompok", kakitangan: "Kakitangan" });
                  }} style={styles.exportBtn}><FileText size={14} /> PDF</button>
                </div>
              </div>
              {txLoading ? (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ width: "32px", height: "32px", border: "3px solid rgba(124, 58, 237, 0.15)", borderTopColor: "#7c3aed", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: "13px", color: "#65676b" }}>Memuatkan transaksi...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Tarikh", "Pesakit", "Item", "Dos", "Kuantiti", "Kelompok", "Kakitangan"].map(h => (
                        <TableHead key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#65676b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.slice(0, 100).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell style={{ fontSize: "13px", whiteSpace: "nowrap" }}>{formatDate(t.tarikh_dibekal)}</TableCell>
                        <TableCell style={{ fontSize: "13px" }}>{t.assignment?.patient?.nama || "-"}</TableCell>
                        <TableCell style={{ fontSize: "13px" }}>{t.assignment?.item?.nama_item || "-"}</TableCell>
                        <TableCell style={{ fontSize: "13px" }}>{t.dos}</TableCell>
                        <TableCell style={{ fontSize: "13px", fontWeight: 600 }}>{t.kuantiti}</TableCell>
                        <TableCell style={{ fontSize: "13px", fontFamily: "monospace" }}>{t.batch?.nombor_kelompok || "-"}</TableCell>
                        <TableCell style={{ fontSize: "13px" }}>{t.staff?.nama || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <style>{`
        @-webkit-keyframes spin { from { -webkit-transform: rotate(0deg); } to { -webkit-transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @-webkit-keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  exportBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px",
    borderRadius: "10px", border: "1.5px solid #e5e7eb", background: "#ffffff",
    color: "#374151", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
    cursor: "pointer", transition: "all 0.15s ease",
  },
};