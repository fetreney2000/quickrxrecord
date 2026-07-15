import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha512");
  return `pbkdf2:${iterations}:${salt}:${key.toString("hex")}`;
}

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

    const { nama, nama_pengguna, kata_laluan, jawatan, peranan } = await request.json();

    if (!nama || !nama_pengguna || !kata_laluan || !peranan) {
      return NextResponse.json({ error: "Semua medan diperlukan." }, { status: 400 });
    }

    // Check for duplicate username
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("nama_pengguna", nama_pengguna.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Nama pengguna sudah wujud." }, { status: 409 });
    }

    const kata_laluan_hash = hashPassword(kata_laluan);

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        nama,
        nama_pengguna: nama_pengguna.toLowerCase(),
        kata_laluan_hash,
        jawatan: jawatan || null,
        peranan,
        aktif: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Create user error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Remove hash from response
    const { kata_laluan_hash: _, ...safeProfile } = data;

    return NextResponse.json({ success: true, profile: safeProfile });
  } catch (err: any) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}