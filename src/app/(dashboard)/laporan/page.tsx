"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LaporanPage() {
  const supabase = createClient();
  const [defaulterMonths, setDefaulterMonths] = useState(3);

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

  // Patient usage
  const { data: patientUsage } = useQuery({
    queryKey: ["report-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_item_assignments")
        .select("*, patient:patients(nama, nombor_kad_pengenalan), item:items(nama_item, kekuatan)")
        .eq("aktif", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Defaulters
  const { data: defaulters } = useQuery({
    queryKey: ["report-defaulters", defaulterMonths],
    queryFn: async () => {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - defaulterMonths);
      
      const { data: activeAssignments, error } = await supabase
        .from("patient_item_assignments")
        .select("*, patient:patients(nama, nombor_kad_pengenalan, nombor_telefon), item:items(nama_item, kekuatan)")
        .eq("aktif", true);
      if (error) throw error;

      const results = [];
      for (const assignment of activeAssignments || []) {
        const { data: lastSupply } = await supabase
          .from("supply_records")
          .select("tarikh_dibekal")
          .eq("assignment_id", assignment.id)
          .order("tarikh_dibekal", { ascending: false })
          .limit(1)
          .single();

        const lastDate = lastSupply ? new Date(lastSupply.tarikh_dibekal) : null;
        if (!lastDate || lastDate < cutoffDate) {
          results.push({ ...assignment, last_supply: lastSupply?.tarikh_dibekal || null });
        }
      }
      return results;
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
      <h1 className="text-2xl font-bold">Laporan</h1>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventori</TabsTrigger>
          <TabsTrigger value="usage">Penggunaan Pesakit</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulter</TabsTrigger>
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

        {/* Patient Usage */}
        <TabsContent value="usage">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Penggunaan Pesakit</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  exportToExcel((patientUsage || []).map((a: any) => ({
                    nama_pesakit: a.patient?.nama, no_kp: a.patient?.nombor_kad_pengenalan,
                    item: `${a.item?.nama_item} ${a.item?.kekuatan}`, dos: a.dos, tarikh_mula: a.tarikh_mula_guna,
                  })), "Laporan_Penggunaan");
                }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Pesakit</TableHead>
                    <TableHead>No. KP</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Dos</TableHead>
                    <TableHead>Tarikh Mula</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientUsage?.slice(0, 100).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.patient?.nama}</TableCell>
                      <TableCell>{a.patient?.nombor_kad_pengenalan || "-"}</TableCell>
                      <TableCell>{a.item?.nama_item} {a.item?.kekuatan}</TableCell>
                      <TableCell>{a.dos || "-"}</TableCell>
                      <TableCell>{formatDate(a.tarikh_mula_guna)}</TableCell>
                    </TableRow>
                  ))}
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

        {/* Defaulters */}
        <TabsContent value="defaulters">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Senarai Defaulter</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Tempoh (bulan):</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={defaulterMonths}
                    onChange={e => setDefaulterMonths(parseInt(e.target.value) || 3)}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  exportToExcel((defaulters || []).map((d: any) => ({
                    nama: d.patient?.nama, no_kp: d.patient?.nombor_kad_pengenalan,
                    telefon: d.patient?.nombor_telefon, item: `${d.item?.nama_item} ${d.item?.kekuatan}`,
                    dos: d.dos, bekalan_terakhir: d.last_supply || "Tiada rekod",
                  })), "Laporan_Defaulter");
                }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Pesakit</TableHead>
                    <TableHead>No. KP</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Dos</TableHead>
                    <TableHead>Bekalan Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaulters?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tiada defaulter dijumpai.</TableCell></TableRow>
                  ) : (
                    defaulters?.slice(0, 200).map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.patient?.nama}</TableCell>
                        <TableCell>{d.patient?.nombor_kad_pengenalan || "-"}</TableCell>
                        <TableCell>{d.patient?.nombor_telefon || "-"}</TableCell>
                        <TableCell>{d.item?.nama_item} {d.item?.kekuatan}</TableCell>
                        <TableCell>{d.dos || "-"}</TableCell>
                        <TableCell>{d.last_supply ? formatDate(d.last_supply) : <Badge variant="destructive">Tiada rekod</Badge>}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}