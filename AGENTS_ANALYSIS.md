# Analisis Pematuhan Keperluan - QuickRxRecord

Dokumen ini menganalisis aplikasi QuickRxRecord terhadap keperluan yang dinyatakan dalam "Agentic LLM Prompt".

Dijana: 15 Julai 2026

---

## 1. Teknologi (Technology Stack)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Next.js v15 (App Router) | ✅ | Menggunakan Next.js 16.2.10 (ke belakang serasi) |
| shadcn/ui (disesuaikan) | ✅ | Komponen UI dari shadcn dengan tema Tokyo Night |
| TanStack Table v8 | ✅ | Digunakan dalam semua halaman (penggabungan dengan shadcn Table) |
| TanStack Query v5 | ✅ | Semua data fetching dan mutations guna `useQuery` / `useMutation` |
| Framer Motion v11 | ✅ | Animasi untuk expand/collapse assignment |
| Hosting Vercel | ✅ | Dideploy di quickrxrecord.vercel.app |
| Backend & Auth: Supabase | ✅ | PostgreSQL, RLS, Auth (sign in with email) |
| Bahasa: Bahasa Melayu | ✅ | Semua teks UI dalam BM |
| Timezone: Asia/Kuala_Lumpur | ✅ | formatDate() menggunakan locale ms-MY |

**Isu/Missing:**
- ✅ Tiada isu kritikal.

---

## 2. Pangkalan Data & Migrasi (Database Schema)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Analisis SQLite3 warisan | ✅ | Dilakukan dalam skrip `scripts/migrate-sqlite.ts` |
| Reka bentuk PostgreSQL schema | ✅ | Dalam `supabase/migrations/001_initial_schema.sql` |
| Integriti relasi (FK, unique) | ✅ | Semua FK dan unique constraint ditetapkan |
| Migrasi tanpa kehilangan data | ✅ | Skrip migrasi memetakan semua jadual warisan |
| Row-Level Security (RLS) | ✅ | Semua jadual di-enable RLS dengan polisi |
| Polisi RLS berdasarkan peranan | ✅ | Polisi RLS menggunakan `get_user_role()` function |
| CHECK constraint (kuantiti >= 0) | ✅ | Pada `item_batches.kuantiti` |

**Isu/Missing:**
- ⚠️ **process_supply() function** wujud di migration SQL tetapi **TIDAK digunakan** oleh frontend. Bekalan stok dilakukan secara manual oleh client (batch decrement dalam `supplyMutation`). Ini boleh menyebabkan **race condition** jika dua pengguna membekal serentak.

---

## 3. Kawalan Akses (RBAC)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Pentadbir - akses penuh | ✅ | Semua permission dalam permissions map |
| Penjaga Stor - urus item/stok | ✅ | manage_items, manage_batches, manage_patients |
| Kakitangan Farmasi - daftar pesakit/bekalan | ✅ | manage_patients, manage_supply, view_reports |
| Kakitangan Klinik - view-only | ✅ | View sahaja (view_items, view_patients) |
| Supabase Auth + roles | ✅ | Peranan disimpan dalam `profiles.peranan` (enum) |
| RLS menguatkuasa di DB | ✅ | Polisi RLS berdasarkan `get_user_role()` |
| UI dikondisikan berdasarkan peranan | ✅ | `hasPermission()` digunakan di semua halaman |

**Isu/Missing:**
- ✅ Tiada isu kritikal.

---

## 4. Pengurusan Pengguna (User Management)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Jadual profiles dengan semua field | ✅ | id, nama, jawatan, peranan, nama_pengguna, aktif |
| Hanya Pentadbir boleh urus pengguna | ✅ | check `!isAdmin` guard di `pengurusan/page.tsx` |
| Halaman pengurusan pengguna | ✅ | `pengurusan/page.tsx` |
| Jadual TanStack Table | ✅ | Menggunakan shadcn Table |
| Inline editing | ✅ | Edit terus dalam baris jadual |
| Borang penciptaan | ✅ | Dialog tambah pengguna |

**Isu/Missing:**
- ✅ Tiada isu kritikal.

---

## 5. Pengurusan Inventori (Inventory Management)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Jadual items dengan kod, nama, kuota | ✅ | Termasuk kekuatan, nama dagangan, kategori |
| Jadual item_batches dengan kelompok | ✅ | nombor_kelompok, tarikh_luput, kuantiti |
| FK item_batches -> items (CASCADE) | ✅ | ON DELETE CASCADE |
| Kuantiti didecrement semasa bekalan | ✅ | Dilakukan dalam `supplyMutation` |
| CHECK constraint (kuantiti >= 0) | ✅ | Dalam migration SQL |
| Batch tamat ditapis (expired) | ✅ | SQL: `.gte("tarikh_luput", new Date().toISOString().split("T")[0])` |
| Penjaga Stor boleh tambah/edit batch | ✅ | Dalam `stok/[id]/page.tsx` |

**Isu/Missing:**
- ⚠️ **Dose update rule (Section 7.2)** - Apabila bekalan dibuat, dos baru TIDAK dikemaskini pada assignment secara automatik. Pengguna perlu guna "Kemaskini Dos" secara berasingan. Spesifikasi menyatakan jika dos diubah sebelum bekalan, assignment's dos perlu dikemaskini.

---

## 6. Pengurusan Pesakit (Patient Management)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Jadual patients dengan semua field | ✅ | Nama, KP, Hospital, Telefon, Alamat, Catatan |
| Nombor KP unique | ✅ | Unique constraint dalam migration |
| Gabung pesakit (Merge) | ✅ | `merge-dialog.tsx` dengan wizard 2 langkah |
| Pindah penugasan & bekalan | ✅ | Reassign assignments, deactivate duplicates |
| Secondary soft-delete (merged_into) | ✅ | `merged_into` FK dan `aktif = false` |

**Isu/Missing:**
- ✅ Tiada isu kritikal.

---

## 7. Sistem Tugasan & Bekalan (Assignment & Supply)

### 7.1 Tugasan

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Jadual patient_item_assignments | ✅ | Semua field: dos, tarikh, staff, aktif, sebab tamat |
| Pesakit boleh ada multiple assignments | ✅ | Tiada unique constraint pada patient_id + item_id |
| Tugasan boleh ditamatkan | ✅ | Dialog tamatkan dengan sebab |
| Dos terkini disimpan | ✅ | `dos` field pada assignment |

### 7.2 Bekalan

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Jadual supply_records | ✅ | assignment_id, dos, tempoh, kuantiti, batch_id, staff |
| Proses bekalan (pilih batch) | ✅ | Senarai batch tersedia dengan stok |
| Decrement batch kuantiti | ✅ | Dilakukan dalam mutation |
| Dose update rule | ⚠️ | Apabila bekalan, dos baru TIDAK dikemaskini pada assignment |
| FIFO automatik | ❌ | Tiada FIFO logic untuk pemilihan batch; pengguna pilih manual |

**Isu/Missing:**
- ❌ **FIFO logic** - Tidak diimplementasi. Pengguna kena pilih batch secara manual.
- ❌ **Transaction-safe supply** - `process_supply()` function wujud di DB tetapi tidak digunakan. Frontend membuat dua operasi berasingan (insert supply + update batch) yang boleh menyebabkan inconsistency jika salah satu gagal.

---

## 8. Laporan (Reports)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Laporan Inventori | ✅ | Paras stok, stok rendah |
| Laporan Penggunaan Pesakit | ✅ | Senarai pesakit dengan item ditugaskan |
| Laporan Transaksi | ✅ | Audit trail bekalan |
| Laporan Defaulter | ✅ | N bulan boleh dikonfigurasi (default 3) |
| Eksport Excel | ✅ | Guna `exceljs` (client-side) |
| Eksport PDF | ✅ | Guna `jspdf` + `jspdf-autotable` (client-side) |

**Isu/Missing:**
- ✅ Tiada isu kritikal.

---

## 9. Aliran Kerja & Reka Bentuk UI (User Workflow)

### 9.1 Login
| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Log masuk dengan nama_pengguna + password | ✅ | SignIn menggunakan `${nama_pengguna}@quickrx.local` |
| Redirect berdasarkan peranan | ⚠️ | Tidak ada redirect spesifik role; semua peranan ke dashboard |

### 9.2 Antara Muka Utama
| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Global search box di navbar | ✅ | Dalam header component: cari pesakit by nama, KP, hospital |
| Search results dalam jadual | ✅ | Dropdown dengan nama, KP, hospital |
| Click buka detail view | ✅ | Navigasi ke `/pesakit/[id]` |

### 9.3 Halaman Detail Pesakit
| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Info pesakit (boleh edit) | ✅ | Edit mode toggle |
| Jadual assignments | ✅ | Dengan status, expand untuk detail |
| Butang "Tambah Penugasan" | ✅ | Farmasi sahaja |
| Butang "Bekal Ubat" | ✅ | Untuk setiap assignment aktif |

### 9.4 Aliran Bekalan
| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Papar dos semasa dengan Edit | ✅ | Dos semasa dipapar read-only; "Kemaskini Dos" button |
| Senarai batch available | ✅ | Hanya batch dengan kuantiti > 0 dan belum luput |
| FIFO option | ❌ | Tiada pilihan FIFO automatik |
| Enter tempoh + kuantiti | ✅ | Tempoh dengan unit (hari/minggu/bulan) |
| Validasi kuantiti <= batch | ❌ | Semakan hanya di DB (CHECK constraint), tiada validation client-side |
| Batch quantity decrement | ✅ | Dilakukan dalam mutation |

### 9.5 Item & Stok Management
| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Dashboard item/stok | ✅ | Stok page + detail page |
| Urus batch (tambah/edit) | ✅ | Dalam `stok/[id]/page.tsx` |
| Senarai pesakit untuk item | ❌ | Tiada paparan pesakit yang menggunakan item tertentu |

**Isu/Missing:**
- ❌ **Item detail page** tidak menunjukkan senarai pesakit yang menggunakan item tersebut (required untuk Kakitangan Klinik view-only).

---

## 10. Keperluan Bukan-Fungsional (Non-Functional)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| **Performance:** TanStack Query | ✅ | Semua data fetching guna `useQuery` |
| **Optimistic updates** | ❌ | Tiada optimistic updates untuk supply actions |
| **Pagination/Lazy-load** | ✅ | Pagination di pesakit, stok, bekalan |
| **PWA dengan service worker** | ✅ | `public/manifest.json` dan `public/sw.js` wujud |
| **Cache app shell** | ❌ | Service worker wujud tetapi perlu disahkan caching strategy |
| **RLS strict** | ✅ | RLS di semua jadual dengan polisi peranan |
| **Server-side validation** | ❌ | Tiada API routes untuk validation; semua mutations direct ke Supabase dari client (kecuali reset-password) |
| **JWT from Supabase** | ✅ | Auth session dikendalikan oleh Supabase |
| **Database transactions** | ❌ | `process_supply()` function wujud tetapi tidak digunakan; frontend buat operasi berasingan |
| **Error handling (Sonner)** | ✅ | Semua mutations/toasts guna `sonner` dalam BM |

**Isu/Missing:**
- ❌ **Server-side validation** - Semua mutations dilakukan terus dari client ke Supabase. Tiada API routes (kecuali reset-password) yang melakukan validasi di server.
- ❌ **Optimistic updates** - Tidak diimplementasi. Pengguna kena tunggu response dari server.
- ❌ **PWA caching strategy** - Service worker wujud tetapi perlu disahkan.

---

## 11. Penghantaran (Deliverables)

| Keperluan | Status | Catatan |
|-----------|--------|---------|
| Codebase lengkap | ✅ | Semua routes, components, API routes |
| Migrations SQL | ✅ | `supabase/migrations/001_initial_schema.sql` |
| Skrip migrasi SQLite | ✅ | `scripts/migrate-sqlite.ts` |
| README dengan setup | ✅ | Persediaan tempatan, deploy Vercel, migrasi data |
| Seed scripts | ❌ | Tiada seed scripts untuk data contoh |

---

## Ringkasan Isu Kritikal

| # | Isu | Prioriti | Cadangan |
|---|-----|----------|----------|
| 1 | **Supply tidak transaction-safe** | Tinggi | Guna `process_supply()` function di Supabase (RPC) daripada buat dua operasi berasingan |
| 2 | **Dos tidak dikemaskini automatik** | Sederhana | Update assignment dos dalam `supplyMutation` jika dos berbeza |
| 3 | **FIFO tidak diimplementasi** | Sederhana | Auto-pilih batch berdasarkan tarikh luput terdekat |
| 4 | **Tiada validasi kuantiti client-side** | Sederhana | Semak `kuantiti <= batch.kuantiti` sebelum hantar mutation |
| 5 | **Tiada server-side validation** | Sederhana | Buat API route untuk supply actions (bukan direct client→Supabase) |
| 6 | **Item detail tidak tunjuk pesakit** | Rendah | Tambah list pesakit menggunakan item tersebut di halaman stok/[id] |
| 7 | **PWA caching tidak disahkan** | Rendah | Semak service worker caching strategy |
| 8 | **Optimistic updates** | Rendah | Tambah `onMutate` untuk supply mutations |
| 9 | **Tiada seed scripts** | Rendah | Tambah skrip untuk data contoh/testing |