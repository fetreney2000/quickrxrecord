import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha512");
  return `pbkdf2:${iterations}:${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [algo, iterations, salt, derivedKey] = hash.split(":");
  if (algo !== "pbkdf2" || !iterations || !salt || !derivedKey) return false;
  const key = crypto.pbkdf2Sync(password, salt, parseInt(iterations), 32, "sha512");
  return key.toString("hex") === derivedKey;
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

    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Semua medan diperlukan." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Kata laluan baharu mesti sekurang-kurangnya 6 aksara." }, { status: 400 });
    }

    // Get current hash
    const { data: profile } = await supabase
      .from("profiles")
      .select("kata_laluan_hash")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil pengguna tidak dijumpai." }, { status: 404 });
    }

    // Verify current password
    if (profile.kata_laluan_hash) {
      const valid = verifyPassword(currentPassword, profile.kata_laluan_hash);
      if (!valid) {
        return NextResponse.json({ error: "Kata laluan semasa tidak sah." }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Sila gunakan log masuk dengan kata laluan." }, { status: 400 });
    }

    // Update with new hash
    const newHash = hashPassword(newPassword);
    const { error } = await supabase
      .from("profiles")
      .update({ kata_laluan_hash: newHash, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Kata laluan berjaya ditukar." });
  } catch (err: any) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}