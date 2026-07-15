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

    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Semua medan diperlukan." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Kata laluan baharu mesti sekurang-kurangnya 6 aksara." }, { status: 400 });
    }

    // Verify current password by attempting sign-in
    const { data: profile } = await supabase
      .from("profiles")
      .select("nama_pengguna")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil pengguna tidak dijumpai." }, { status: 404 });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${profile.nama_pengguna}@quickrx.local`,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: "Kata laluan semasa tidak sah." }, { status: 401 });
    }

    // Update password
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Failed to update password:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Kata laluan berjaya ditukar." });
  } catch (err: any) {
    console.error("change-password API error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}