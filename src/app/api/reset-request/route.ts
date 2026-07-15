import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi pelayan tidak lengkap." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
    }

    // Check if user already has a pending request
    const { data: existing } = await supabase
      .from("password_reset_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Anda sudah mempunyai permintaan reset yang belum selesai." }, { status: 409 });
    }

    const { error } = await supabase.from("password_reset_requests").insert({
      user_id: userId,
    });

    if (error) {
      console.error("Failed to create reset request:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Permintaan reset kata laluan telah dihantar kepada pentadbir." });
  } catch (err: any) {
    console.error("reset-request API error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}