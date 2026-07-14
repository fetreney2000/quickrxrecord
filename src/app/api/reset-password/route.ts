import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function extractUserNotFoundMessage(message: string): boolean {
  return (
    message?.toLowerCase().includes("user not found") ||
    message?.toLowerCase().includes("not found") ||
    message?.toLowerCase().includes("no user") ||
    message?.includes("User from sub claim") ||
    message?.includes("Could not find user")
  );
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return NextResponse.json(
        { error: "Konfigurasi pelayan tidak lengkap. Sila tetapkan SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId diperlukan" }, { status: 400 });
    }

    // Try updating password first
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: "password123",
    });

    // If user doesn't exist in auth.users, create them first
    if (error && extractUserNotFoundMessage(error.message)) {
      console.log("User not found in auth.users, attempting to create...");

      // Fetch profile to get nama_pengguna for email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nama_pengguna, nama")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found for userId:", userId, profileError);
        return NextResponse.json(
          { error: "Profil pengguna tidak dijumpai." },
          { status: 404 }
        );
      }

      // Create the user in auth.users with the SAME id as the profile
      // (This preserves all foreign key references in other tables)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: `${profile.nama_pengguna}@quickrx.local`,
        password: "password123",
        email_confirm: true,
        user_metadata: { full_name: profile.nama },
        id: userId,
      } as any);

      if (createError) {
        console.error("Failed to create auth user:", createError);
        return NextResponse.json(
          { error: createError.message || "Gagal mencipta pengguna auth." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (error) {
      console.error("Supabase admin updateUserById error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("reset-password unexpected error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman" }, { status: 500 });
  }
}
