import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export function verifyPassword(password: string, hash: string): boolean {
  const [algo, iterations, salt, derivedKey] = hash.split(":");
  if (algo !== "pbkdf2" || !iterations || !salt || !derivedKey) return false;
  const key = crypto.pbkdf2Sync(password, salt, parseInt(iterations), 32, "sha512");
  return key.toString("hex") === derivedKey;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha512");
  return `pbkdf2:${iterations}:${salt}:${key.toString("hex")}`;
}

export async function POST(request: Request) {
  try {
    const { nama_pengguna, kata_laluan } = await request.json();

    if (!nama_pengguna || !kata_laluan) {
      return NextResponse.json({ error: "Sila isi semua medan." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Ralat konfigurasi pelayan." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find user by username
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("nama_pengguna", nama_pengguna.toLowerCase())
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 401 });
    }

    const profile = profiles[0];

    if (!profile.aktif) {
      return NextResponse.json({ error: "Akaun ini telah dinyahaktifkan." }, { status: 401 });
    }

    // Check password hash
    const hash = profile.kata_laluan_hash;
    if (hash) {
      const valid = verifyPassword(kata_laluan, hash);
      if (!valid) {
        return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 401 });
      }
    } else {
      // Fallback: try Supabase Auth sign-in for legacy users
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: `${nama_pengguna}@quickrx.local`,
        password: kata_laluan,
      });
      if (authError) {
        return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 401 });
      }
    }

    // Remove hash from response
    const { kata_laluan_hash, ...safeProfile } = profile;

    return NextResponse.json({
      success: true,
      profile: safeProfile,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Ralat semasa log masuk." }, { status: 500 });
  }
}