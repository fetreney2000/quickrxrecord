"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Search, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 30;

export default function BekalanPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["supply-list", search, page],
    queryFn: async () => {
      let query = supabase
        .from("supply_records")
        .select("*, assignment:patient_item_assignments(patient_id, patient:patients(id, nama), item:items(nama_item, kekuatan)), batch:item_batches(nombor_kelompok), staff:profiles!kakitangan_pembekal(nama)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { records: data || [], total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rekod Bekalan Ubat</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{data?.total || 0} rekod</Badge>
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
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuatkan...</TableCell></TableRow>
              ) : data?.records.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tiada rekod bekalan.</TableCell></TableRow>
              ) : (
                (data?.records as any[])?.map((record: any) => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer"
                    onClick={() => record.assignment?.patient_id && router.push(`/pesakit/${record.assignment.patient_id}`)}
                  >
                    <TableCell>{formatDate(record.tarikh_dibekal)}</TableCell>
                    <TableCell className="font-medium">{record.assignment?.patient?.nama || "-"}</TableCell>
                    <TableCell>{record.assignment?.item?.nama_item} {record.assignment?.item?.kekuatan}</TableCell>
                    <TableCell>{record.dos}</TableCell>
                    <TableCell>{record.kuantiti}</TableCell>
                    <TableCell>{record.batch?.nombor_kelompok || "-"}</TableCell>
                    <TableCell>{record.staff?.nama || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Halaman {page + 1} daripada {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}