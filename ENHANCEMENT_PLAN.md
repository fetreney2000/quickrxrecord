# QuickRxRecord — Pelan Penambahbaikan Komprehensif

**Untuk Kegunaan Harian Farmasi Hospital**  
*Disediakan: 23 Julai 2026*

---

## Penilaian Semasa

Asas sistem adalah kukuh: skema pangkalan data yang bersih dengan penjejakan kelompok (batch), inventori berkonsepkan FEFO, RBAC dengan 4 peranan, potongan stok melalui fungsi PostgreSQL (transaction-safe), keupayaan gabung pesakit, eksport Excel/PDF, sokongan PWA, dan UI yang menarik dengan Framer Motion. Semua teks dalam Bahasa Melayu. Sistem ini sudah mencapai tahap production-grade.

---

## 🔴 Keutamaan 1 — Ciri Keselamatan Pesakit (Patient Safety)

| # | Ciri | Kepentingan |
|---|------|-------------|
| 1 | **Rekod & Amaran Alergi Ubat** — Sebelum mendispens, sistem MESTI memberi amaran jika pesakit mempunyai rekod alergi kepada kelas ubat yang sedang didispens. Tambah jadual `drug_allergies` (patient_id, drug_class, allergen, reaction_severity, recorded_by). Semak pada setiap acara bekalan. | Tidak boleh dirunding untuk farmasi hospital. |
| 2 | **Daftar Ubat Terkawal (CD Register)** — Hospital Malaysia mesti menyelenggara daftar berasingan untuk ubat terkawal/psikotropik (Akta Dadah Berbahaya 1952). Tambah bendera `is_controlled_drug` pada item, memerlukan pengesahan dwi-tandatangan, dan auto-jana laporan daftar CD. | Keperluan undang-undang. |
| 3 | **Validasi Julat Dos** — Tambah medan `min_dose`/`max_dose` pada `items` atau `patient_item_assignments`. Tandakan apabila dos yang dipreskrib jatuh di luar julat terapeutik standard. Ini menangkap kesilapan preskripsi berbahaya. | Mencegah medication error. |
| 4 | **Pengesanan Terapi Berganda (Duplicate Therapy)** — Amaran apabila pesakit didispens dua ubat dari kelas terapeutik yang sama secara serentak (contoh: dua NSAID). Memerlukan medan `therapeutic_class` pada items/kategori. | Mencegah adverse drug events. |

---

## 🔴 Keutamaan 2 — Kecekapan Aliran Kerja (Workflow Efficiency)

| # | Ciri | Kepentingan |
|---|------|-------------|
| 5 | ✅ **Dispens Pantas (Quick Dispense Workflow)** — ~~Aliran semasa memerlukan klik melalui pesakit → tugasan → bekalan. Tambah halaman **"Dispens Pantas"**: satu kotak carian yang mencari pesakit melalui nama/IC/nombor hospital, auto-cadang, kemudian memaparkan borang pendispensan satu skrin (pilih item → pilih kelompok → masukkan kuantiti → sahkan). Staf sepatutnya boleh selesai mendispens dalam masa bawah 10 saat.~~ **DILAKSANAKAN** — Halaman `/pantas` dengan carian pesakit, item kerap (10 teratas), pemilihan kelompok auto-FEFO, dan borang pendispensan satu skrin. | Tugasan paling kerap — dilakukan 50+ kali sehari. |
| 6 | **Sokongan Imbasan Kod Bar (Barcode)** — Item dan pesakit patut mempunyai label kod bar (dijana oleh sistem). Pendispensan boleh dicetuskan dengan mengimbas gelang pesakit + kod bar ubat. Gunakan Web Barcode Detection API atau mod tangkapan input ringkas. | Mempercepatkan dan mengurangkan ralat. |
| 7 | **Auto-Pilih Kelompok FEFO** — Semasa mendispens, sistem sepatutnya auto-cadang kelompok mana untuk digunakan berdasarkan FEFO (First Expired, First Out). Pada masa ini staf perlu memilih kelompok secara manual. Fungsi `process_supply` patut menerima `item_id` dan auto-memilih kelompok paling awal luput dengan stok mencukupi. | Mengurangkan pembaziran ubat luput. |
| 8 | **Item Kerap/Frequent Items** — Pada skrin pendispensan, paparkan baris 10 item paling kerap didispens sebagai butang ketik pantas. Di wad hospital, 15-20 ubat yang sama didispens 80% daripada masa. | Jimat masa carian. |
| 9 | ✅ **Navigasi Papan Kekunci** — ~~Pengguna kuasa sepatutnya boleh menavigasi keseluruhan aliran pendispensan melalui papan kekunci: Tab antara medan, Enter untuk sahkan, Escape untuk batal. Ini lebih pantas daripada tetikus/sentuh untuk pengguna desktop.~~ **DILAKSANAKAN** — Escape untuk undur (clearForm/clearPatient), Enter untuk sahkan bekalan, semua dialog utama menyokong Enter. | Produktiviti pengguna kuasa. |

---

## 🟡 Keutamaan 3 — Kawalan Inventori

| # | Ciri | Kepentingan |
|---|------|-------------|
| 10 | **Modul Stokambil (Stocktake)** — Kiraan fizikal berkala adalah wajib. Tambah aliran stokambil: beku stok → cetak helaian kiraan → staf masukkan kiraan → sistem menandakan perbezaan → pengurus meluluskan pelarasan. Ini adalah cara farmasi sebenar merekonsiliasi stok fizikal vs sistem. | Keperluan audit. |
| 11 | **Pelarasan Stok dengan Kod Sebab** — Pada masa ini tiada cara untuk melaraskan stok di luar acara bekalan (pecah, pelupusan luput, stok dijumpai). Tambah jadual `stock_adjustments` dengan kod sebab (rosak, luput, hilang, dijumpai, pelarasan_stok) dan aliran kelulusan. Log transaksi sudah wujud — sambungkan sahaja. | Integriti inventori. |
| 12 | **Pengurusan Pesanan Semula (Reorder)** — Apabila stok jatuh di bawah `kuota` (takat pesanan semula), auto-jana senarai cadangan pembelian. Tambah medan `reorder_quantity` pada item. Jana laporan "Cadangan Pesanan" yang boleh digunakan oleh perolehan. | Mencegah kehabisan stok. |
| 13 | **Analisis ABC** — Klasifikasi item mengikut nilai penggunaan tahunan (A = 80% teratas, B = 15% seterusnya, C = 5% terbawah). Fokus perhatian pengurusan pada item A. Ini adalah amalan standard pengurusan farmasi. | Pengurusan inventori strategik. |
| 14 | **Papan Pemuka Luput dengan Amaran** — Anda sudah menjejak tarikh luput. Tingkatkan dengan: (a) widget papan pemuka berkod warna (merah <30 hari, kuning 30-90 hari, hijau >90 hari), (b) notifikasi emel/dalam aplikasi automatik kepada Penjaga Stor, (c) senarai boleh cetak "Item Luput Bulan Ini" untuk pusingan wad. | Mencegah pembaziran. |

---

## 🟡 Keutamaan 4 — Penambahbaikan Pengurusan Pesakit

| # | Ciri | Kepentingan |
|---|------|-------------|
| 15 | **Nisbah Pemilikan Ubat (MPR - Medication Possession Ratio)** — Kira kepatuhan: (hari bekalan didispens / hari dalam tempoh). Tandakan pesakit dengan MPR < 80% untuk intervensi. Ini adalah metrik klinikal utama untuk pengurusan penyakit kronik (HIV, TB, hipertensi). | Pemantauan kepatuhan rawatan. |
| 16 | **Kalendar Isi Semula (Refill Calendar)** — Berdasarkan tarikh dispens terakhir + tempoh bekalan, ramalkan bila setiap pesakit perlu isi semula. Paparkan senarai "Isi Semula Minggu Ini". Ini mencegah gangguan rawatan. | Kesinambungan rawatan. |
| 17 | **Senarai Ubat Pesakit (Cetak)** — Jana "Senarai Ubat Pesakit" boleh cetak yang menunjukkan preskripsi aktif semasa dengan arahan dos — berguna untuk kaunseling pesakit dan pusingan wad. | Komunikasi pesakit. |
| 18 | **Import Pesakit Pukal** — Untuk migrasi data awal atau kemas kini berkala dari HIS hospital, sokong muat naik CSV rekod pesakit dengan pengesanan duplikat. | Migrasi data. |

---

## 🟢 Keutamaan 5 — Pelaporan & Analitik

| # | Ciri | Kepentingan |
|---|------|-------------|
| 19 | **Laporan Trend Penggunaan** — Trend penggunaan bulanan/suku tahunan setiap item dengan carta. Penting untuk perancangan perolehan dan ramalan belanjawan. Gunakan data `supply_records` sedia ada. | Perancangan belanjawan. |
| 20 | **Analisis Kos** — Tambah `harga_seunit` (unit cost) pada `item_batches`. Jejak jumlah kos barang didispens setiap tempoh. Hospital memerlukan ini untuk pelaporan belanjawan. | Akauntabiliti kewangan. |
| 21 | **Ringkasan Dispens Harian (Serah Tugas Syif)** — Ringkasan satu halaman menunjukkan: jumlah pesakit dilayan hari ini, 10 item teratas didispens, amaran stok, tugasan belum selesai. Boleh dicetak untuk serah tugas pertukaran syif. | Komunikasi syif. |
| 22 | **Laporan Defaulter** — Disebut dalam README tetapi halaman laporan semasa hanya menunjukkan inventori/transaksi. Tambah laporan defaulter yang betul: pesakit yang tidak mengambil isi semula X hari melepasi tarikh isi semula yang dijangkakan. | Intervensi kepatuhan. |
| 23 | **Laporan Penilaian Penggunaan Ubat (DUE - Drug Usage Evaluation)** — Untuk stewardsi antimikrob dan pengurusan formulari: jejak ubat mana digunakan oleh wad/doktor mana, kenal pasti corak preskripsi luar biasa. | Stewardsi antibiotik. |

---

## 🟢 Keutamaan 6 — UX & Infrastruktur

| # | Ciri | Kepentingan |
|---|------|-------------|
| 24 | **Mod Gelap (Dark Mode)** — Anda sudah ada `next-themes` dipasang. Laksanakan togol mod gelap — staf farmasi sering bekerja syif malam dan skrin terang menyebabkan ketegangan mata. | Keselesaan pengguna. |
| 25 | **Pusat Notifikasi** — Loceng notifikasi dalam aplikasi menunjukkan: amaran stok rendah, amaran luput, kelulusan belum selesai, permintaan gabung. Dengan toast notifikasi sedia ada melalui `sonner`, lanjutkan ke panel notifikasi kekal. | Kesedaran situasi. |
| 26 | **Log Audit** — Tambah jadual `audit_logs` (user_id, action, table_affected, record_id, old_values, new_values, ip_address, created_at). Rekod setiap CREATE/UPDATE/DELETE. Kritikal untuk tujuan medico-legal dan penyiasatan insiden. | Keperluan medico-legal. |
| 27 | **Baris Gilir Luar Talian (Offline Queue)** — WiFi hospital boleh tidak stabil. Cache data terkini secara tempatan dan baris gilir transaksi pendispensan untuk disegerakkan apabila sambungan dipulihkan. Gunakan service worker PWA sedia ada. | Daya tahan sistem. |
| 28 | **Pencetakan Label** — Jana dan cetak label ubat khusus pesakit (nama, ubat, dos, kekerapan, tarikh, label amaran). Gunakan `window.print()` penyemak imbas dengan CSS `@page` atau integrasi dengan pencetak termal. | Pematuhan pendispensan. |
| 29 | **Papan Pemuka Berasaskan Peranan** — Setiap peranan melihat widget papan pemuka berbeza. Kakitangan Klinik hanya perlu "pesakit hari ini" dan "carian ketersediaan stok." Penjaga Stor perlu KPI inventori penuh. Pada masa ini semua orang melihat statistik yang sama. | Relevan konteks. |
| 30 | **Lembaran Pintasan Papan Kekunci** — Tekan `?` untuk menunjukkan modal dengan semua pintasan papan kekunci. Ini membantu melatih pengguna kuasa. | Onboarding pengguna. |

---

## 🔵 Keutamaan 7 — Integrasi & Skala

| # | Ciri | Kepentingan |
|---|------|-------------|
| 31 | **Antara Muka HIS/HL7** — Sistem Maklumat Hospital menggunakan HL7/FHIR. Sekurang-kurangnya, sokong import/eksport CSV demografi pesakit dan preskripsi dari HIS utama. | Integrasi sistem. |
| 32 | **Sokongan Pelbagai Lokasi/Wad** — Jika hospital mempunyai pelbagai lokasi farmasi (pesakit luar, pesakit dalam, stok wad), tambah konsep `lokasi` untuk menjejak di mana stok ditempatkan secara fizikal dan dari mana pesakit berasal. | Skala operasi. |
| 33 | **Peringatan Isi Semula SMS/WhatsApp** — Integrasi dengan gateway (contoh: Twilio, MessageBird) untuk menghantar peringatan isi semula automatik kepada pesakit. Ini secara dramatik meningkatkan kepatuhan dalam program penyakit kronik. | Penglibatan pesakit. |

---

## Pelan Hala Tuju Pelaksanaan (Implementation Roadmap)

### Fasa 1 (Segera — 2-4 minggu)
Impak harian terbesar + keselamatan pesakit kritikal:
- **#5, #7, #8** — Dispens Pantas + Auto-Pilih Kelompok FEFO + Item Kerap ✅ **#5 dilaksanakan** (halaman `/pantas`, 23 Julai 2026)
- **#1** — Rekod & Amaran Alergi Ubat (kritikal keselamatan pesakit)
- **#24** — Mod Gelap (quick win, pakej sudah dipasang)

### Fasa 2 (Jangka Pendek — 4-8 minggu)
Keperluan pematuhan & kawalan:
- **#2, #3, #4** — Daftar CD, Validasi Dos, Pengesanan Terapi Berganda
- **#10, #11, #12** — Stokambil, Pelarasan Stok, Pesanan Semula
- **#26** — Log Audit

### Fasa 3 (Jangka Sederhana — 2-4 bulan)
Analitik & pelaporan lanjutan:
- **#14, #19, #20, #22** — Papan Pemuka Luput, Trend Penggunaan, Analisis Kos, Laporan Defaulter
- **#18, #28** — Import Pukal, Pencetakan Label
- **#25** — Pusat Notifikasi

### Fasa 4 (Jangka Panjang — 4-6 bulan)
Integrasi & ciri lanjutan:
- **#6, #27, #29, #31** — Kod Bar, Luar Talian, Papan Pemuka Peranan, Integrasi HIS
- **#15, #16, #17, #23** — MPR, Kalendar Isi Semula, Senarai Ubat Pesakit, Laporan DUE
- **#32, #33** — Pelbagai Lokasi, Peringatan SMS

---

## Nota Teknikal

Semua ciri yang dicadangkan adalah serasi dengan timbunan teknologi sedia ada:
- **Frontend:** Next.js 15 (App Router) + TypeScript + shadcn/ui + Tailwind CSS + TanStack Query + Framer Motion
- **Backend:** Supabase (PostgreSQL + Auth + RLS) dengan fungsi PostgreSQL tersimpan
- **Eksport:** ExcelJS + jsPDF (sudah dipasang)
- **PWA:** Service worker sedia ada

Struktur pangkalan data sedia ada (jadual `items`, `item_batches`, `patients`, `patient_item_assignments`, `supply_records`, `dose_history`, `profiles`) menyediakan asas yang kukuh untuk semua penambahan yang dicadangkan.

---

*Dokumen ini disediakan sebagai pelan hala tuju strategik untuk pembangunan QuickRxRecord. Setiap fasa boleh dipecahkan kepada tiket/sprint yang lebih terperinci mengikut keperluan pasukan.*