# QuickRx - Sistem Pengurusan Inventori & Pesakit

Sistem pengurusan inventori dan pesakit berasaskan web untuk klinik/farmasi. Dibina dengan Next.js 15, Supabase, dan Tailwind CSS.

## Ciri-ciri Utama

- **Pengurusan Pesakit** - Daftar, cari, edit, dan gabung rekod pesakit
- **Pengurusan Inventori** - Ubat denganjejakan kelompok (batch), tarikh luput, dan kuantiti
- **Sistem Bekalan** - Rekod bekalan ubat kepada pesakit dengan pengurangan stok automatik
- **Kawalan Akses (RBAC)** - 4 peranan: Pentadbir, Penjaga Stor, Kakitangan Farmasi, Kakitangan Klinik
- **Laporan & Eksport** - Inventori, penggunaan, transaksi, defaulter (Excel/PDF)
- **PWA** - Boleh dipasang pada peranti mudah alih
- **Bahasa Melayu** - Semua teks dalam Bahasa Melayu Malaysia

## Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Jadual | TanStack Table v8 |
| State | TanStack Query v5 |
| Animasi | Framer Motion v11 |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Hosting | Vercel |

## Persediaan Tempatan

### Prasyarat

- Node.js 18+ 
- npm atau yarn
- Akaun Supabase (percuma)

### 1. Pasang Pakej

```bash
cd quickrx
npm install
```

### 2. Tetapkan Supabase

1. Cipta projek baharu di [supabase.com](https://supabase.com)
2. Dapatkan URL dan Anon Key dari Settings > API
3. Jalankan migrasi SQL di SQL Editor Supabase:
   - Buka fail `supabase/migrations/001_initial_schema.sql`
   - Salin dan jalankan keseluruhan kandungan dalam SQL Editor

### 3. Konfigurasi Environment

Cipta fail `.env.local`:

```bash
cp .env.local.example .env.local
```

Isi nilai:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx
```

### 4. Cipta Pengguna Pentadbir Pertama

Di Supabase SQL Editor, jalankan:

```sql
-- Cipta pengguna auth (tukar nilai mengikut keperluan)
-- Lakukan melalui Supabase Dashboard > Authentication > Users > Add User
-- Email: admin@quickrx.local
-- Password: [kata laluan anda]

-- Kemudian, selepas pengguna dicipta, ambil UUID dari auth.users
-- dan masukkan ke profiles:
INSERT INTO profiles (id, nama, jawatan, peranan, nama_pengguna)
VALUES (
  '[UUID_pengguna_dari_auth.users]',
  'Pentadbir Sistem',
  'Pentadbir',
  'Pentadbir',
  'admin'
);
```

### 5. Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Deploy ke Vercel

### Cara Mudah

1. Push kod ke GitHub/GitLab
2. Pergi ke [vercel.com](https://vercel.com) dan import repo
3. Tetapkan environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Melalui CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Migrasi Data Legacy (SRQ.db3)

Untuk memindahkan data dari database SQLite lama:

### Prasyarat

- `SUPABASE_URL` - URL projek Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (dari Supabase Dashboard > Settings > API)

### Jalankan Migrasi

```bash
# Install tsx jika belum ada
npm install -g tsx

# Jalankan skrip migrasi
SUPABASE_URL=https://xxxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxx \
npx tsx scripts/migrate-sqlite.ts
```

Skrip ini akan:
1. Membaca semua data dari SRQ.db3
2. Memetakannya ke skema baharu
3. Memasukkan data ke Supabase dalam urutan yang betul
4. Mengekalkan integriti rujukan

**Nota:** Kelompok (batch) sintetik akan dicipta untuk setiap item kerana data lama tidak menjejaki kelompok.

## Struktur Projek

```
quickrx/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Tailwind + CSS variables
│   │   ├── login/page.tsx      # Halaman log masuk
│   │   └── (dashboard)/        # Route kumpulan dilindungi
│   │       ├── layout.tsx      # Dashboard layout + sidebar
│   │       ├── page.tsx        # Papan pemuka
│   │       ├── pesakit/        # Pengurusan pesakit
│   │       ├── stok/           # Pengurusan inventori
│   │       ├── bekalan/        # Bekalan ubat
│   │       ├── laporan/        # Laporan & eksport
│   │       └── pengurusan/     # Pengurusan pengguna
│   ├── components/
│   │   ├── ui/                 # Komponen shadcn/ui
│   │   └── layout/             # Sidebar, header
│   ├── lib/
│   │   ├── supabase/           # Klien Supabase
│   │   ├── auth-context.tsx    # Konteks auth + RBAC
│   │   ├── query-provider.tsx  # TanStack Query
│   │   └── utils.ts            # Fungsi utiliti
│   ├── hooks/                  # Custom hooks
│   └── types/                  # TypeScript types
├── supabase/
│   └── migrations/             # Fail migrasi SQL
├── scripts/
│   └── migrate-sqlite.ts       # Skrip migrasi data
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
└── README.md
```

## Peranan & Kebenaran

| Peranan | Boleh Buat |
|---------|-----------|
| **Pentadbir** | Semua akses, termasuk pengurusan pengguna |
| **Penjaga Stor** | Urus item, kelompok, pesakit, bekalan, laporan |
| **Kakitangan Farmasi** | Daftar pesakit, tugasan, bekalan, laporan |
| **Kakitangan Klinik** | Lihat sahaja (item, pesakit) |

## Lesen

Hak cipta terpelihara. Untuk kegunaan dalaman klinik/farmasi.