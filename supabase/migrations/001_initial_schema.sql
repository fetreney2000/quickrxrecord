-- QuickRx Database Schema for Supabase (PostgreSQL)
-- Sistem Pengurusan Inventori & Pesakit

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE peranan_enum AS ENUM (
  'Pentadbir',
  'Penjaga Stor',
  'Kakitangan Farmasi',
  'Kakitangan Klinik'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (Pengguna)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  jawatan TEXT,
  peranan peranan_enum NOT NULL DEFAULT 'Kakitangan Farmasi',
  nama_pengguna TEXT UNIQUE NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items (Senarai Ubat)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kod_item TEXT UNIQUE NOT NULL,
  nama_item TEXT NOT NULL,
  nama_dagangan TEXT,
  kekuatan TEXT,
  id_kategori UUID,
  id_bentuk UUID,
  kuota INTEGER,
  catatan TEXT,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item Batches (Kelompok)
CREATE TABLE item_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  nombor_kelompok TEXT NOT NULL,
  tarikh_luput DATE NOT NULL,
  kuantiti INTEGER NOT NULL DEFAULT 0 CHECK (kuantiti >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients (Pesakit)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  nombor_kad_pengenalan TEXT,
  nombor_pendaftaran_hospital TEXT,
  dokumen_lain TEXT,
  nombor_telefon TEXT,
  alamat TEXT,
  catatan TEXT,
  aktif BOOLEAN NOT NULL DEFAULT true,
  merged_into UUID REFERENCES patients(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient Item Assignments (Penugasan)
CREATE TABLE patient_item_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  item_id UUID NOT NULL REFERENCES items(id),
  dos TEXT,
  tarikh_mula_guna DATE NOT NULL,
  dimulakan_oleh UUID REFERENCES profiles(id),
  tarikh_tamat_guna DATE,
  ditamatkan_oleh UUID REFERENCES profiles(id),
  kakitangan_farmasi_perekod UUID REFERENCES profiles(id),
  aktif BOOLEAN NOT NULL DEFAULT true,
  sebab_tamat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supply Records (Rekod Bekalan)
CREATE TABLE supply_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES patient_item_assignments(id),
  tarikh_dibekal TIMESTAMPTZ NOT NULL DEFAULT now(),
  dos TEXT NOT NULL,
  tempoh_dibekal TEXT,
  kuantiti INTEGER NOT NULL CHECK (kuantiti > 0),
  batch_id UUID REFERENCES item_batches(id),
  kakitangan_pembekal UUID NOT NULL REFERENCES profiles(id),
  catatan_bekalan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dose History (Rekod Dos)
CREATE TABLE dose_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES patient_item_assignments(id),
  tarikh DATE NOT NULL,
  dos TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_item_batches_item_id ON item_batches(item_id);
CREATE INDEX idx_item_batches_luput ON item_batches(tarikh_luput);
CREATE INDEX idx_patient_assignments_patient ON patient_item_assignments(patient_id);
CREATE INDEX idx_patient_assignments_item ON patient_item_assignments(item_id);
CREATE INDEX idx_patient_assignments_active ON patient_item_assignments(aktif) WHERE aktif = true;
CREATE INDEX idx_supply_assignment ON supply_records(assignment_id);
CREATE INDEX idx_supply_date ON supply_records(tarikh_dibekal);
CREATE INDEX idx_dose_assignment ON dose_history(assignment_id);
CREATE INDEX idx_patients_name ON patients(nama);
CREATE INDEX idx_patients_kp ON patients(nombor_kad_pengenalan);
CREATE INDEX idx_patients_hospital ON patients(nombor_pendaftaran_hospital);
CREATE INDEX idx_items_name ON items(nama_item);
CREATE INDEX idx_items_kod ON items(kod_item);

-- ============================================================
-- TRIGGERS - Updated timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_item_batches_updated_at BEFORE UPDATE ON item_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON patient_item_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_item_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_history ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT peranan::text FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (get_user_role() = 'Pentadbir');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (get_user_role() = 'Pentadbir');
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (get_user_role() = 'Pentadbir');

-- Items policies - all authenticated can read
CREATE POLICY "items_select" ON items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "items_insert" ON items FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));
CREATE POLICY "items_update" ON items FOR UPDATE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));
CREATE POLICY "items_delete" ON items FOR DELETE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));

-- Item batches policies
CREATE POLICY "batches_select" ON item_batches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "batches_insert" ON item_batches FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));
CREATE POLICY "batches_update" ON item_batches FOR UPDATE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));
CREATE POLICY "batches_delete" ON item_batches FOR DELETE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));

-- Patients policies
CREATE POLICY "patients_select" ON patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "patients_update" ON patients FOR UPDATE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));

-- Assignment policies
CREATE POLICY "assignments_select" ON patient_item_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assignments_insert" ON patient_item_assignments FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "assignments_update" ON patient_item_assignments FOR UPDATE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "assignments_delete" ON patient_item_assignments FOR DELETE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor'));

-- Supply records policies
CREATE POLICY "supply_select" ON supply_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supply_insert" ON supply_records FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "supply_update" ON supply_records FOR UPDATE USING (get_user_role() = 'Pentadbir');
CREATE POLICY "supply_delete" ON supply_records FOR DELETE USING (get_user_role() = 'Pentadbir');

-- Dose history policies
CREATE POLICY "dose_select" ON dose_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dose_insert" ON dose_history FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "dose_update" ON dose_history FOR UPDATE USING (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));
CREATE POLICY "dose_delete" ON dose_history FOR DELETE USING (get_user_role() = 'Pentadbir');

-- ============================================================
-- FUNCTION: Supply with stock deduction (transaction-safe)
-- ============================================================

CREATE OR REPLACE FUNCTION process_supply(
  p_assignment_id UUID,
  p_dos TEXT,
  p_tempoh_dibekal TEXT,
  p_kuantiti INTEGER,
  p_batch_id UUID,
  p_kakitangan_pembekal UUID,
  p_catatan_bekalan TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_supply_id UUID;
  v_current_stock INTEGER;
BEGIN
  -- Check batch stock
  SELECT kuantiti INTO v_current_stock
  FROM item_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Kelompok tidak dijumpai.';
  END IF;

  IF v_current_stock < p_kuantiti THEN
    RAISE EXCEPTION 'Stok tidak mencukupi. Stok semasa: %, diperlukan: %', v_current_stock, p_kuantiti;
  END IF;

  -- Decrement batch stock
  UPDATE item_batches
  SET kuantiti = kuantiti - p_kuantiti
  WHERE id = p_batch_id;

  -- Create supply record
  INSERT INTO supply_records (
    assignment_id, dos, tempoh_dibekal, kuantiti, batch_id, kakitangan_pembekal, catatan_bekalan
  ) VALUES (
    p_assignment_id, p_dos, p_tempoh_dibekal, p_kuantiti, p_batch_id, p_kakitangan_pembekal, p_catatan_bekalan
  ) RETURNING id INTO v_supply_id;

  -- Update assignment dose if changed
  UPDATE patient_item_assignments
  SET dos = p_dos, updated_at = now()
  WHERE id = p_assignment_id AND dos IS DISTINCT FROM p_dos;

  -- Record dose history
  INSERT INTO dose_history (assignment_id, tarikh, dos)
  VALUES (p_assignment_id, CURRENT_DATE, p_dos);

  RETURN v_supply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Merge patients
-- ============================================================

CREATE OR REPLACE FUNCTION merge_patients(
  p_primary_id UUID,
  p_secondary_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  v_secondary_id UUID;
BEGIN
  FOREACH v_secondary_id IN ARRAY p_secondary_ids
  LOOP
    -- Re-link assignments
    UPDATE patient_item_assignments
    SET patient_id = p_primary_id
    WHERE patient_id = v_secondary_id;

    -- Mark secondary as merged
    UPDATE patients
    SET merged_into = p_primary_id, aktif = false, updated_at = now()
    WHERE id = v_secondary_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;