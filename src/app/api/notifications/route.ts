import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi pelayan tidak lengkap." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const role = url.searchParams.get("role");

    if (!userId && !role) {
      return NextResponse.json({ error: "userId atau role diperlukan." }, { status: 400 });
    }

    const notifications: any[] = [];

    if (!role || role === "Penjaga Stor") {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const { data: expiring } = await supabase
        .from("item_batches")
        .select("id, item_id, nombor_kelompok, tarikh_luput, kuantiti, item:items(nama_item)")
        .lt("tarikh_luput", thirtyDays.toISOString().split("T")[0])
        .gt("kuantiti", 0)
        .order("tarikh_luput", { ascending: true })
        .limit(10);

      for (const batch of (expiring || []) as any[]) {
        const daysLeft = Math.ceil((new Date(batch.tarikh_luput).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        notifications.push({
          type: "expiry_soon",
          title: "Kelompok Akan Luput",
          message: `${batch.item?.nama_item} (${batch.nombor_kelompok}) akan luput dalam ${daysLeft} hari. Stok: ${batch.kuantiti}`,
          link: `/stok/${batch.item_id}`,
          severity: daysLeft <= 7 ? "critical" : "warning",
          role: "Penjaga Stor",
        });
      }
    }

    if (!role || role === "Penjaga Stor") {
      const { data: items } = await supabase
        .from("items")
        .select("id, kod_item, nama_item, kuota, item_batches(kuantiti)")
        .eq("aktif", true);

      for (const item of (items || []) as any[]) {
        const totalStock = (item.item_batches || []).reduce((s: number, b: any) => s + (b.kuantiti || 0), 0);
        if (item.kuota && totalStock < item.kuota) {
          notifications.push({
            type: "low_stock",
            title: "Stok Rendah",
            message: `${item.nama_item} (${item.kod_item}) - Stok: ${totalStock}, Kuota: ${item.kuota}`,
            link: `/stok/${item.id}`,
            severity: totalStock === 0 ? "critical" : "warning",
            role: "Penjaga Stor",
          });
        }
      }
    }

    if (!role || role === "Penjaga Stor") {
      const { data: assignments } = await supabase
        .from("patient_item_assignments")
        .select("item_id, item:items(nama_item, kod_item, kuota)")
        .eq("aktif", true);

      const itemCount: Record<string, { count: number; name: string; kod: string; kuota: number }> = {};
      for (const a of (assignments || []) as any[]) {
        if (!itemCount[a.item_id]) {
          itemCount[a.item_id] = { count: 0, name: a.item?.nama_item || "", kod: a.item?.kod_item || "", kuota: a.item?.kuota || 0 };
        }
        itemCount[a.item_id].count++;
      }

      for (const [itemId, info] of Object.entries(itemCount)) {
        if (info.kuota && info.count >= info.kuota) {
          notifications.push({
            type: "quota_full",
            title: "Kuota Penuh",
            message: `${info.name} (${info.kod}) telah mencapai kuota ${info.kuota} pesakit.`,
            link: `/stok/${itemId}`,
            severity: "warning",
            role: "Penjaga Stor",
          });
        }
      }
    }

    if (!role || role === "Pentadbir") {
      const { data: pendingResets } = await supabase
        .from("password_reset_requests")
        .select("id, user_id, user:profiles!password_reset_requests_user_id_fkey(nama, nama_pengguna)")
        .eq("status", "pending")
        .limit(10);

      for (const req of (pendingResets || []) as any[]) {
        notifications.push({
          type: "password_reset_request",
          title: "Permintaan Reset Kata Laluan",
          message: `${req.user?.nama || "Pengguna"} (@${req.user?.nama_pengguna}) meminta reset kata laluan.`,
          link: "/pengurusan",
          severity: "info",
          role: "Pentadbir",
        });
      }
    }

    if (!role || role === "Kakitangan Farmasi") {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      const { data: activeAssignments } = await supabase
        .from("patient_item_assignments")
        .select("id, patient_id, patient:patients(nama), item:items(nama_item)")
        .eq("aktif", true);

      for (const assignment of ((activeAssignments || []) as any[]).slice(0, 20)) {
        const { data: lastSupply } = await supabase
          .from("supply_records")
          .select("tarikh_dibekal")
          .eq("assignment_id", assignment.id)
          .order("tarikh_dibekal", { ascending: false })
          .limit(1)
          .single();

        const lastDate = lastSupply ? new Date(lastSupply.tarikh_dibekal) : null;
        if (!lastDate || lastDate < cutoffDate) {
          notifications.push({
            type: "defaulter_alert",
            title: "Pesakit Defaulter",
            message: `${assignment.patient?.nama} - ${assignment.item?.nama_item}. Tiada bekalan sejak ${lastDate ? lastDate.toLocaleDateString("ms-MY") : "tiada rekod"}.`,
            link: `/pesakit/${assignment.patient_id}`,
            severity: "warning",
            role: "Kakitangan Farmasi",
          });
        }
      }
    }

    const seen = new Set<string>();
    const unique = notifications.filter(n => {
      const key = `${n.type}:${n.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);

    for (const notif of unique) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", notif.type)
        .eq("message", notif.message)
        .eq("is_read", false)
        .maybeSingle();

      if (!existing) {
        try {
          await supabase.from("notifications").insert({
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
            severity: notif.severity,
            role: notif.role,
            user_id: role === notif.role ? userId : null,
          });
        } catch {}
      }
    }

    const query = supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (userId) {
      query.or(`user_id.eq.${userId},role.eq.${role}`);
    } else if (role) {
      query.eq("role", role);
    }

    const { data: existing } = await query;

    return NextResponse.json({
      notifications: existing || [],
      generated: unique.length,
    });
  } catch (err: any) {
    console.error("notifications API error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi pelayan tidak lengkap." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json();

    // Clear all notifications
    if (body.clearAll && body.userId) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false)
        .or(`user_id.eq.${body.userId},role.eq.${body.role}`);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Clear single notification
    const { notificationId } = body;
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId diperlukan." }, { status: 400 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("notifications PATCH error:", err);
    return NextResponse.json({ error: err.message || "Ralat dalaman." }, { status: 500 });
  }
}