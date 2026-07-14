/**
 * Migration script: SRQ.db3 (SQLite) → Supabase (PostgreSQL)
 * 
 * Usage:
 *   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 *   2. Run: npx tsx scripts/migrate-sqlite.ts
 * 
 * This script:
 *   - Reads all data from the legacy SQLite database (SRQ.db3)
 *   - Maps it to the new Supabase schema
 *   - Inserts data in correct order to maintain referential integrity
 */

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Sila tetapkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const db = new Database(path.join(__dirname, "..", "SRQ.db3"), { readonly: true });

// Deterministic UUID from integer ID
function intToUuid(table: string, id: number): string {
  const hex = id.toString(16).padStart(12, "0");
  // Use a fixed namespace-like prefix per table
  const prefixes: Record<string, string> = {
    items: "a0000000-0000-0000-0000-",
    patients: "b0000000-0000-0000-0000-",
    profiles: "c0000000-0000-0000-0000-",
    assignments: "d0000000-0000-0000-0000-",
    supply: "e0000000-0000-0000-0000-",
    dose: "f0000000-0000-0000-0000-",
    batch: "a1000000-0000-0000-0000-",
  };
  return `${prefixes[table] || "00000000-0000-0000-0000-"}${hex}`;
}

async function migrate() {
  console.log("Memulakan migrasi dari SRQ.db3...");

  // 1. Migrate Items (tblSenaraiUbat)
  console.log("Migrasi item...");
  const items = db.prepare("SELECT * FROM tblSenaraiUbat").all() as any[];
  const itemRows = items.map((item) => ({
    id: intToUuid("items", item.ID),
    kod_item: `ITM-${String(item.ID).padStart(4, "0")}`,
    nama_item: item.Nama,
    nama_dagangan: item.Nama_Dagangan || null,
    kekuatan: item.Kekuatan || null,
    kuota: item.Kuota,
    catatan: item.Catatan || null,
    aktif: item.Aktif === 1,
  }));

  // Batch insert items
  for (let i = 0; i < itemRows.length; i += 500) {
    const batch = itemRows.slice(i, i + 500);
    const { error } = await supabase.from("items").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat item:", error.message);
  }
  console.log(`  ${itemRows.length} item dimigrasikan.`);

  // 2. Migrate Patients (tblPesakit)
  console.log("Migrasi pesakit...");
  const patients = db.prepare("SELECT * FROM tblPesakit").all() as any[];
  const patientRows = patients.map((p) => ({
    id: intToUuid("patients", p.ID),
    nama: p.Nama,
    nombor_kad_pengenalan: p.Kad_Pengenalan || null,
    nombor_pendaftaran_hospital: p.Nombor_Pendaftaran || null,
    dokumen_lain: p.Dokumen_Lain || null,
    nombor_telefon: p.Nombor_Telefon || null,
    alamat: p.Alamat || null,
    aktif: p.Aktif === 1,
    created_at: p.Tarikh_Daftar ? `${p.Tarikh_Daftar}T00:00:00+08:00` : new Date().toISOString(),
  }));

  for (let i = 0; i < patientRows.length; i += 500) {
    const batch = patientRows.slice(i, i + 500);
    const { error } = await supabase.from("patients").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat pesakit:", error.message);
  }
  console.log(`  ${patientRows.length} pesakit dimigrasikan.`);

  // 3. Migrate Staff as Profiles (tblKakitangan)
  console.log("Migrasi kakitangan ke profiles...");
  const staff = db.prepare("SELECT * FROM tblKakitangan").all() as any[];
  // Note: Staff records don't have auth users. Create placeholder profiles.
  const profileRows = staff.map((s) => ({
    id: intToUuid("profiles", s.ID),
    nama: s.Nama,
    jawatan: null,
    peranan: "Kakitangan Farmasi",
    nama_pengguna: `staff_${s.ID}`,
    aktif: s.Aktif === 1,
  }));

  for (let i = 0; i < profileRows.length; i += 500) {
    const batch = profileRows.slice(i, i + 500);
    const { error } = await supabase.from("profiles").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat profil:", error.message);
  }
  console.log(`  ${profileRows.length} profil dimigrasikan.`);

  // 4. Create synthetic batches for each item (legacy data has no batches)
  console.log("Mencipta kelompok sintetik...");
  const batchRows = items.map((item) => ({
    id: intToUuid("batch", item.ID),
    item_id: intToUuid("items", item.ID),
    nombor_kelompok: "LEGACY-001",
    tarikh_luput: "2030-12-31",
    kuantiti: 0, // Unknown stock from legacy
  }));

  for (let i = 0; i < batchRows.length; i += 500) {
    const batch = batchRows.slice(i, i + 500);
    const { error } = await supabase.from("item_batches").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat kelompok:", error.message);
  }
  console.log(`  ${batchRows.length} kelompok sintetik dicipta.`);

  // 5. Migrate Assignments (tblRekodPenggunaanUbat)
  console.log("Migrasi penugasan...");
  const assignments = db.prepare("SELECT * FROM tblRekodPenggunaanUbat").all() as any[];

  // Get latest dose for each assignment
  const latestDose = new Map<number, string>();
  const doses = db.prepare("SELECT ID_Penggunaan_Ubat, Dos, Tarikh FROM tblDos ORDER BY Tarikh DESC").all() as any[];
  for (const d of doses) {
    if (!latestDose.has(d.ID_Penggunaan_Ubat)) {
      latestDose.set(d.ID_Penggunaan_Ubat, d.Dos);
    }
  }

  const assignmentRows = assignments.map((a) => ({
    id: intToUuid("assignments", a.ID),
    patient_id: intToUuid("patients", a.ID_Pesakit),
    item_id: intToUuid("items", a.ID_Ubat),
    dos: latestDose.get(a.ID) || null,
    tarikh_mula_guna: a.Tarikh_Mula,
    tarikh_tamat_guna: a.Tarikh_Tamat || null,
    aktif: a.Aktif === 1,
    sebab_tamat: a.Sebab_Tamat || null,
    ditamatkan_oleh: a.ID_Kakitangan_Henti ? intToUuid("profiles", a.ID_Kakitangan_Henti) : null,
  }));

  for (let i = 0; i < assignmentRows.length; i += 500) {
    const batch = assignmentRows.slice(i, i + 500);
    const { error } = await supabase.from("patient_item_assignments").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat penugasan:", error.message);
  }
  console.log(`  ${assignmentRows.length} penugasan dimigrasikan.`);

  // 6. Migrate Supply Records (tblRekodBekalan)
  console.log("Migrasi rekod bekalan...");
  const supplies = db.prepare("SELECT * FROM tblRekodBekalan").all() as any[];
  const supplyRows = supplies.map((s) => ({
    id: intToUuid("supply", s.ID),
    assignment_id: intToUuid("assignments", s.ID_Penggunaan_Ubat),
    tarikh_dibekal: `${s.Tarikh}T00:00:00+08:00`,
    dos: s.Dos,
    tempoh_dibekal: s.Durasi_Bekalan || null,
    kuantiti: s.Kuantiti,
    batch_id: null, // Legacy has no batch tracking
    kakitangan_pembekal: intToUuid("profiles", s.ID_Kakitangan),
    catatan_bekalan: s.Catatan_Bekalan || null,
  }));

  for (let i = 0; i < supplyRows.length; i += 1000) {
    const batch = supplyRows.slice(i, i + 1000);
    const { error } = await supabase.from("supply_records").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat bekalan:", error.message);
  }
  console.log(`  ${supplyRows.length} rekod bekalan dimigrasikan.`);

  // 7. Migrate Dose History (tblDos)
  console.log("Migrasi sejarah dos...");
  const doseRecords = db.prepare("SELECT * FROM tblDos").all() as any[];
  const doseRows = doseRecords.map((d) => ({
    id: intToUuid("dose", d.ID),
    assignment_id: intToUuid("assignments", d.ID_Penggunaan_Ubat),
    tarikh: d.Tarikh,
    dos: d.Dos,
    aktif: d.Aktif === 1,
    catatan: d.Catatan || null,
  }));

  for (let i = 0; i < doseRows.length; i += 1000) {
    const batch = doseRows.slice(i, i + 1000);
    const { error } = await supabase.from("dose_history").upsert(batch, { onConflict: "id" });
    if (error) console.error("Ralat dos:", error.message);
  }
  console.log(`  ${doseRows.length} sejarah dos dimigrasikan.`);

  db.close();
  console.log("\nMigrasi selesai!");
}

migrate().catch(console.error);