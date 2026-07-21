import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Konfigurasi pelayan tidak lengkap." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json();
    const { assignment_id, dos, tempoh_dibekal, kuantiti, batch_id, kakitangan_pembekal, catatan_bekalan } = body;

    // Server-side validation
    if (!assignment_id || !kuantiti || !kakitangan_pembekal) {
      return NextResponse.json(
        { error: "Medan yang diperlukan tidak lengkap." },
        { status: 400 }
      );
    }

    const parsedKuantiti = parseInt(kuantiti, 10);
    if (isNaN(parsedKuantiti) || parsedKuantiti <= 0) {
      return NextResponse.json(
        { error: "Kuantiti mesti lebih daripada 0." },
        { status: 400 }
      );
    }

    // Determine batch via FEFO if not provided
    let targetBatchId = batch_id || null;
    if (!targetBatchId) {
      const assignment = await supabase
        .from("patient_item_assignments")
        .select("item_id")
        .eq("id", assignment_id)
        .single();

      if (assignment.error || !assignment.data) {
        return NextResponse.json(
          { error: "Penugasan tidak dijumpai." },
          { status: 404 }
        );
      }

      const batches = await supabase
        .from("item_batches")
        .select("id, kuantiti, nombor_kelompok, tarikh_luput")
        .eq("item_id", assignment.data.item_id)
        .gt("kuantiti", 0)
        .gte("tarikh_luput", new Date().toISOString().split("T")[0])
        .order("tarikh_luput", { ascending: true }) // FEFO
        .order("created_at", { ascending: true })   // then FIFO

      if (batches.error || !batches.data || batches.data.length === 0) {
        return NextResponse.json(
          { error: "Tiada kelompok tersedia untuk item ini." },
          { status: 400 }
        );
      }

      targetBatchId = batches.data[0].id;
    }

    // Validate batch has enough stock
    const batch = await supabase
      .from("item_batches")
      .select("kuantiti, nombor_kelompok")
      .eq("id", targetBatchId)
      .single();

    if (batch.error || !batch.data) {
      return NextResponse.json(
        { error: "Kelompok tidak dijumpai." },
        { status: 404 }
      );
    }

    if (batch.data.kuantiti < parsedKuantiti) {
      return NextResponse.json(
        {
          error: `Stok tidak mencukupi. Stok semasa: ${batch.data.kuantiti}, diperlukan: ${parsedKuantiti}`,
        },
        { status: 400 }
      );
    }

    // Transaction-safe: call process_supply() database function
    const { data, error: rpcError } = await supabase.rpc("process_supply", {
      p_assignment_id: assignment_id,
      p_dos: dos,
      p_tempoh_dibekal: tempoh_dibekal || null,
      p_kuantiti: parsedKuantiti,
      p_batch_id: targetBatchId,
      p_kakitangan_pembekal: kakitangan_pembekal,
      p_catatan_bekalan: catatan_bekalan || null,
    });

    if (rpcError) {
      console.error("process_supply RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Gagal memproses bekalan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      supply_id: data,
      batch_id: targetBatchId,
    });
  } catch (err: any) {
    console.error("supply API unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Ralat dalaman." },
      { status: 500 }
    );
  }
}