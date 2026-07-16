"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LaporanPage() {
  const supabase = createClient();

  // Inventory report
  const { data: inventoryData } = useQuery({
    queryKey: ["report-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*, item_batches(*)")
        .eq("aktif", true)
        .order("nama_item");
      if (error) throw error;
      return data;
    },
  });

  // Supply transactions
  const { data: transactions } = useQuery({
    queryKey: ["report-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supply_records")
        .select("*, assignment:patient_item_assignments(patient:patients(nama), item:items(nama_item, kekuatan)), batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const exportToExcel = async (data: any[], filename: string) => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(filename);
      
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        ws.addRow(headers);
        data.forEach(row => ws.addRow(headers.map(h => String(row[h] ?? ""))));
      }
      
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fail Excel berjaya dimuat turun.");
    } catch {
      toast.error("Gagal mengeksport fail Excel.");
    }
  };

  const exportToPDF = async (data: any[], filename: string, columns: string[]) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      
      const doc = new jsPDF();
      doc.text(filename, 14, 15);
      
      const rows = data.map(row => columns.map(col => String(row[col] ?? "")));
      
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 20,
        styles: { fontSize: 8 },
      });
      
      doc.save(`${filename}.pdf`);
      toast.success("Fail PDF berjaya dimuat turun.");
    } catch {
      toast.error("Gagal mengeksport fail PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Papan Pemuka", href: "/" },
        { label: "Laporan" },
      ]} />
      <h1 className="text-2xl font-bold">Laporan</h1>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventori</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
        </TabsList>

        {/* Inventory Report */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Paras Stok Inventori</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const flatData = (inventoryData || []).flatMap((item: any) =>
                    (item.item_batches || []).map((batch: any) => ({
                      kod_item: item.kod_item,
                      nama_item: item.nama_item,
                      kekuatan: item.kekuatan,
                      kuota: item.kuota,
                      nombor_kelompok: batch.nombor_kelompok,
                      tarikh_luput: batch.tarikh_luput,
                      kuantiti: batch.kuantiti,
                    }))
                  );
                  exportToExcel(flatData, "Laporan_Inventori");
                }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const flatData = (inventoryData || []).flatMap((item: any) =>
                    (item.item_batches || []).map((batch: any) => ({
                      kod_item: item.kod_item, nama_item: item.nama_item, kekuatan: item.kekuatan,
                      nombor_kelompok: batch.nombor_kelompok, tarikh_luput: batch.tarikh_luput, kuantiti: batch.kuantiti,
                    }))
                  );
                  exportToPDF(flatData, "Laporan Inventori", ["kod_item", "nama_item", "kekuatan", "nombor_kelompok", "tarikh_luput", "kuantiti"]);
                }}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
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
                    <TableHead>Stok Rendah?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData?.map((item: any) => {
                    const totalStock = item.item_batches?.reduce((s: number, b: any) => s + b.kuantiti, 0) || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.kod_item}</TableCell>
                        <TableCell>{item.nama_item}</TableCell>
                        <TableCell>{item.kekuatan || "-"}</TableCell>
                        <TableCell>{item.kuota ?? "-"}</TableCell>
                        <TableCell>{totalStock}</TableCell>
                        <TableCell>
                          {item.kuota && totalStock < item.kuota && (
                            <Badge variant="destructive">Stok Rendah</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Log Transaksi Bekalan</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  exportToExcel((transactions || []).slice(0, 500).map((t: any) => ({
                    tarikh: t.tarikh_dibekal, pesakit: t.assignment?.patient?.nama,
                    item: t.assignment?.item?.nama_item, dos: t.dos, kuantiti: t.kuantiti,
                    kelompok: t.batch?.nombor_kelompok, kakitangan: t.staff?.nama,
                  })), "Laporan_Transaksi");
                }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Pesakit</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Dos</TableHead>
                    <TableHead>Kuantiti</TableHead>
                    <TableHead>Kelompok</TableHead>
                    <TableHead>Kakitangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.slice(0, 100).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.tarikh_dibekal)}</TableCell>
                      <TableCell>{t.assignment?.patient?.nama || "-"}</TableCell>
                      <TableCell>{t.assignment?.item?.nama_item || "-"}</TableCell>
                      <TableCell>{t.dos}</TableCell>
                      <TableCell>{t.kuantiti}</TableCell>
                      <TableCell>{t.batch?.nombor_kelompok || "-"}</TableCell>
                      <TableCell>{t.staff?.nama || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}