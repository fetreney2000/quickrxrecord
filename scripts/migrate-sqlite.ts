/**
 * Migration script: SRQ.db3 (SQLite) → Supabase (PostgreSQL)
 *
 * ** OVERWRITE MODE **
 * Clears all existing data from Supabase tables before migrating fresh data
 * from the legacy SQLite database.
 *
 * Prerequisites:
 *   - Run 007_schema_gaps.sql migration on your Supabase project first
 *   - .env.local must have SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL set
 *
 * Usage:
 *   cd quickrx-new && npx tsx --env-file=.env.local scripts/migrate-sqlite.ts
 */

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// ── Config ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      let val = trimmed.slice(eqIdx + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Sila tetapkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dalam .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// SRQ.db3 is at quickrxrecord/SRQ.db3 (sibling of quickrx-new/ directory)
const dbPath = path.join(__dirname, "..", "..", "SRQ.db3");
if (!fs.existsSync(dbPath)) {
  console.error(`SRQ.db3 tidak dijumpai di: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

// ── UUID Mapping ──────────────────────────────────────────────────────
const UUID_NAMESPACES: Record<string, string> = {
  items:           "a0000000-0000-0000-0000-",
  patients:        "b0000000-0000-0000-0000-",
  assignments:     "d0000000-0000-0000-0000-",
  supply:          "e0000000-0000-0000-0000-",
  dose:            "f0000000-0000-0000-0000-",
  batch:           "a1000000-0000-0000-0000-",
};

function intToUuid(table: string, id: number): string {
  const hex = id.toString(16).padStart(12, "0");
  return `${UUID_NAMESPACES[table] || "00000000-0000-0000-0000-"}${hex}`;
}

// ── Globals ───────────────────────────────────────────────────────────
let totalErrors = 0;

// Map old staff ID → Supabase auth user UUID (set during staff migration)
const staffAuthMap = new Map<number, string>();

// ── Helpers ───────────────────────────────────────────────────────────
async function clearTable(table: string) {
  const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    console.error(`  ✗ Gagal mengosongkan ${table}: ${error.message}`);
    totalErrors++;
    return;
  }
  console.log(`  ✓ ${table} dikosongkan.`);
}

async function batchInsert(table: string, rows: any[], batchSize = 500, conflictCol = "id") {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol });
    if (error) {
      totalErrors++;
      console.error(`  ✗ ${table}[${i}-${i + batch.length}]: ${error.message}`);
    }
  }
  console.log(`  ✓ ${rows.length} rekod dimasukkan ke ${table}`);
}

const DELETE_ORDER = [
  "dose_history",
  "supply_records",
  "batch_adjustments",
  "patient_item_assignments",
  "item_batches",
  "staff_migration_lookup",
  "items",
  "patients",
  "profiles",
];

// ── Main Migration ────────────────────────────────────────────────────
async function migrate() {
  console.log("==========================================");
  console.log("  MIGRASI SRQ.db3 → SUPABASE (OVERWRITE)");
  console.log("==========================================\n");

  // ── 0. Clear existing data ───────────────────────────────────────
  console.log("[0] Mengosongkan data sedia ada...");
  for (const table of DELETE_ORDER) {
    await clearTable(table);
  }
  console.log("  ✓ Semua data dikosongkan.\n");

  // ── 1. Items: tblSenaraiUbat → items ────────────────────────────
  console.log("[1] Migrasi item (tblSenaraiUbat → items)...");
  const items = db.prepare("SELECT * FROM tblSenaraiUbat").all() as any[];

  const categoryIdMap: Record<number, string> = {
    1: "a0000000-0000-0000-0000-000000000001",
    2: "a0000000-0000-0000-0000-000000000002",
    3: "a0000000-0000-0000-0000-000000000003",
    4: "a0000000-0000-0000-0000-000000000004",
    5: "a0000000-0000-0000-0000-000000000005",
    6: "a0000000-0000-0000-0000-000000000006",
  };
  const formIdMap: Record<number, string> = {
    1:  "b0000000-0000-0000-0000-000000000001",
    2:  "b0000000-0000-0000-0000-000000000002",
    3:  "b0000000-0000-0000-0000-000000000003",
    4:  "b0000000-0000-0000-0000-000000000004",
    5:  "b0000000-0000-0000-0000-000000000005",
    6:  "b0000000-0000-0000-0000-000000000006",
    7:  "b0000000-0000-0000-0000-000000000007",
    8:  "b0000000-0000-0000-0000-000000000008",
    9:  "b0000000-0000-0000-0000-000000000009",
    10: "b0000000-0000-0000-0000-000000000010",
    11: "b0000000-0000-0000-0000-000000000011",
  };

  const itemRows = items.map((item: any) => ({
    id: intToUuid("items", item.ID),
    kod_item: `ITM-${String(item.ID).padStart(4, "0")}`,
    nama_item: item.Nama,
    nama_dagangan: item.Nama_Dagangan || null,
    kekuatan: item.Kekuatan || null,
    id_kategori: categoryIdMap[item.ID_Kategori] || null,
    id_bentuk: formIdMap[item.ID_Bentuk] || null,
    kuota: item.Kuota || null,
    catatan: item.Catatan || null,
    aktif: item.Aktif === 1,
  }));

  await batchInsert("items", itemRows);
  console.log();

  // ── 2. Patients: tblPesakit → patients ──────────────────────────
  console.log("[2] Migrasi pesakit (tblPesakit → patients)...");
  const patients = db.prepare("SELECT * FROM tblPesakit").all() as any[];
  const patientRows = patients.map((p: any) => ({
    id: intToUuid("patients", p.ID),
    nama: p.Nama,
    nombor_kad_pengenalan: p.Kad_Pengenalan || null,
    nombor_pendaftaran_hospital: p.Nombor_Pendaftaran || null,
    dokumen_lain: p.Dokumen_Lain || null,
    nombor_telefon: p.Nombor_Telefon || null,
    alamat: p.Alamat || null,
    aktif: p.Aktif === 1,
    tarikh_daftar: p.Tarikh_Daftar || null,
    created_at: p.Tarikh_Daftar
      ? `${p.Tarikh_Daftar}T00:00:00+08:00`
      : new Date().toISOString(),
  }));

  await batchInsert("patients", patientRows);
  console.log();

  // ── 3. Staff: tblKakitangan → auth users + profiles ─────────────
  console.log("[3] Migrasi kakitangan (tblKakitangan → profiles + auth)...");
  const staff = db.prepare("SELECT * FROM tblKakitangan").all() as any[];

  // Create auth users first
  console.log("  Mencipta pengguna auth...");
  for (const s of staff) {
    const namaPengguna = (s.Nama || "").trim().replace(/\s+/g, "_");
    const email = `${namaPengguna.toLowerCase()}@hospital.gov.my`;
    try {
      const { data: createdUser, error } = await supabase.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
        user_metadata: { nama: s.Nama },
      });
      if (error) {
        if (error.message.includes("already been registered")) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const existing = users?.users?.find((u: any) => u.email === email);
          if (existing) {
            staffAuthMap.set(s.ID, existing.id);
          } else {
            console.error(`\n    ✗ Tidak jumpa: ${email}`);
            totalErrors++;
          }
        } else {
          console.error(`\n    ✗ ${email}: ${error.message}`);
          totalErrors++;
        }
      } else if (createdUser?.user) {
        staffAuthMap.set(s.ID, createdUser.user.id);
      }
    } catch (e: any) {
      console.error(`\n    ✗ ${email}: ${e.message}`);
      totalErrors++;
    }
  }
  console.log(`  ✓ ${staffAuthMap.size} pengguna auth dicipta.`);

  // Insert profiles using auth user UUIDs
  const profileRows = staff
    .filter((s: any) => staffAuthMap.has(s.ID))
    .map((s: any) => {
      const namaPengguna = (s.Nama || "").trim().replace(/\s+/g, "_");
      return {
        id: staffAuthMap.get(s.ID),
        nama: s.Nama,
        jawatan: null,
        peranan: "Kakitangan Farmasi",
        nama_pengguna: namaPengguna,
        aktif: s.Aktif === 1,
      };
    });

  await batchInsert("profiles", profileRows);

  const staffLookupRows = staff
    .filter((s: any) => staffAuthMap.has(s.ID))
    .map((s: any) => ({
      old_id: s.ID,
      profile_id: staffAuthMap.get(s.ID),
    }));
  await batchInsert("staff_migration_lookup", staffLookupRows, 500, "old_id");
  console.log();

  // ── 4. Synthetic batches per item ────────────────────────────────
  console.log("[4] Cipta kelompok sintetik (item_batches)...");
  const batchRows = items.map((item: any) => ({
    id: intToUuid("batch", item.ID),
    item_id: intToUuid("items", item.ID),
    nombor_kelompok: "LEGACY-001",
    tarikh_luput: "2030-12-31",
    kuantiti: 10000,
  }));

  await batchInsert("item_batches", batchRows);
  console.log();

  // ── 5. Assignments: tblRekodPenggunaanUbat → patient_item_assignments
  console.log("[5] Migrasi penugasan (tblRekodPenggunaanUbat → patient_item_assignments)...");
  const assignments = db.prepare("SELECT * FROM tblRekodPenggunaanUbat").all() as any[];

  const latestDose = new Map<number, string>();
  const doses = db.prepare(
    "SELECT ID_Penggunaan_Ubat, Dos, Tarikh FROM tblDos ORDER BY Tarikh DESC"
  ).all() as any[];
  for (const d of doses) {
    if (!latestDose.has(d.ID_Penggunaan_Ubat)) {
      latestDose.set(d.ID_Penggunaan_Ubat, d.Dos);
    }
  }

  const assignmentRows = assignments.map((a: any) => ({
    id: intToUuid("assignments", a.ID),
    patient_id: intToUuid("patients", a.ID_Pesakit),
    item_id: intToUuid("items", a.ID_Ubat),
    dos: latestDose.get(a.ID) || null,
    tarikh_mula_guna: a.Tarikh_Mula,
    tarikh_tamat_guna: a.Tarikh_Tamat || null,
    aktif: a.Aktif === 1,
    sebab_tamat: a.Sebab_Tamat || null,
    catatan_penggunaan: a.Catatan_Penggunaan || null,
    ditamatkan_oleh: a.ID_Kakitangan_Henti
      ? (staffAuthMap.get(a.ID_Kakitangan_Henti) || null)
      : null,
  }));

  await batchInsert("patient_item_assignments", assignmentRows);
  console.log();

  // ── 6. Supply Records: tblRekodBekalan → supply_records ──────────
  console.log("[6] Migrasi rekod bekalan (tblRekodBekalan → supply_records)...");
  const supplies = db.prepare("SELECT * FROM tblRekodBekalan").all() as any[];
  const supplyRows = supplies.map((s: any) => ({
    id: intToUuid("supply", s.ID),
    assignment_id: intToUuid("assignments", s.ID_Penggunaan_Ubat),
    tarikh_dibekal: `${s.Tarikh}T00:00:00+08:00`,
    dos: s.Dos,
    tempoh_dibekal: s.Durasi_Bekalan || null,
    kuantiti: s.Kuantiti,
    batch_id: null,
    kakitangan_pembekal: staffAuthMap.get(s.ID_Kakitangan) || null,
    catatan_bekalan: s.Catatan_Bekalan || null,
  }));

  await batchInsert("supply_records", supplyRows, 1000);
  console.log();

  // ── 7. Dose History: tblDos → dose_history ───────────────────────
  console.log("[7] Migrasi sejarah dos (tblDos → dose_history)...");
  const doseRecords = db.prepare("SELECT * FROM tblDos").all() as any[];
  const doseRows = doseRecords.map((d: any) => ({
    id: intToUuid("dose", d.ID),
    assignment_id: intToUuid("assignments", d.ID_Penggunaan_Ubat),
    tarikh: d.Tarikh,
    dos: d.Dos,
    aktif: d.Aktif === 1,
    catatan: d.Catatan || null,
  }));

  await batchInsert("dose_history", doseRows, 1000);
  console.log();

  // ── Done ─────────────────────────────────────────────────────────
  db.close();

  const total = {
    items: itemRows.length,
    patients: patientRows.length,
    profiles: profileRows.length,
    batches: batchRows.length,
    assignments: assignmentRows.length,
    supplies: supplyRows.length,
    doses: doseRows.length,
  };

  console.log("==========================================");
  console.log("  MIGRASI SELESAI!");
  console.log("==========================================");
  console.log(`  Item:           ${total.items}`);
  console.log(`  Pesakit:        ${total.patients}`);
  console.log(`  Kakitangan:     ${total.profiles}`);
  console.log(`  Kelompok:       ${total.batches}`);
  console.log(`  Penugasan:      ${total.assignments}`);
  console.log(`  Bekalan:        ${total.supplies}`);
  console.log(`  Sejarah Dos:    ${total.doses}`);
  console.log("------------------------------------------");
  if (totalErrors > 0) {
    console.log(`  ⚠ ${totalErrors} ralat berlaku — semak log di atas.`);
  } else {
    console.log("  ✓ Tiada ralat.");
  }
  console.log("==========================================\n");
}

migrate().catch((err) => {
  console.error("Migrasi gagal:", err);
  process.exit(1);
});