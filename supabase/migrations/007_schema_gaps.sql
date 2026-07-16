-- Schema Gaps: Align quickrx schema with SRQ.db3 data model
-- Adds missing lookup tables and columns to fully accommodate legacy data

-- ============================================================
-- 1. ITEM CATEGORIES (tblSenaraiKategoriUbat)
-- ============================================================
CREATE TABLE item_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_categories_name ON item_categories(nama);

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_categories_select" ON item_categories FOR SELECT USING (true);
CREATE POLICY "item_categories_insert" ON item_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "item_categories_update" ON item_categories FOR UPDATE USING (true);
CREATE POLICY "item_categories_delete" ON item_categories FOR DELETE USING (true);

-- Seed SRQ.db3 categories
INSERT INTO item_categories (id, nama) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Kategori A'),
  ('a0000000-0000-0000-0000-000000000002', 'Psikiatrik'),
  ('a0000000-0000-0000-0000-000000000003', 'KPK Item'),
  ('a0000000-0000-0000-0000-000000000004', 'Kategori B'),
  ('a0000000-0000-0000-0000-000000000005', 'Kategori A/KK (Ubat Terkawal)'),
  ('a0000000-0000-0000-0000-000000000006', 'Kategori A*');

-- ============================================================
-- 2. ITEM FORMS / DOSAGE FORMS (tblSenaraiBentukDos)
-- ============================================================
CREATE TABLE item_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_forms_name ON item_forms(nama);

ALTER TABLE item_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_forms_select" ON item_forms FOR SELECT USING (true);
CREATE POLICY "item_forms_insert" ON item_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "item_forms_update" ON item_forms FOR UPDATE USING (true);
CREATE POLICY "item_forms_delete" ON item_forms FOR DELETE USING (true);

-- Seed SRQ.db3 dosage forms
INSERT INTO item_forms (id, nama) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Tablet'),
  ('b0000000-0000-0000-0000-000000000002', 'Kapsul'),
  ('b0000000-0000-0000-0000-000000000003', 'Sirap'),
  ('b0000000-0000-0000-0000-000000000004', 'Patch'),
  ('b0000000-0000-0000-0000-000000000005', 'Drops'),
  ('b0000000-0000-0000-0000-000000000006', 'Injection'),
  ('b0000000-0000-0000-0000-000000000007', 'Eye Drops'),
  ('b0000000-0000-0000-0000-000000000008', 'Nasal Spray'),
  ('b0000000-0000-0000-0000-000000000009', 'Inhaler'),
  ('b0000000-0000-0000-0000-000000000010', 'Solution'),
  ('b0000000-0000-0000-0000-000000000011', 'Serbuk');

-- ============================================================
-- 3. SUPPLY DURATIONS (tblSenaraiDurasiBekalan) - Optional lookup
-- ============================================================
CREATE TABLE supply_durations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supply_durations_name ON supply_durations(nama);

ALTER TABLE supply_durations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supply_durations_select" ON supply_durations FOR SELECT USING (true);
CREATE POLICY "supply_durations_insert" ON supply_durations FOR INSERT WITH CHECK (true);
CREATE POLICY "supply_durations_update" ON supply_durations FOR UPDATE USING (true);
CREATE POLICY "supply_durations_delete" ON supply_durations FOR DELETE USING (true);

-- Seed SRQ.db3 durations
INSERT INTO supply_durations (id, nama) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Hari'),
  ('c0000000-0000-0000-0000-000000000002', 'Minggu'),
  ('c0000000-0000-0000-0000-000000000003', 'Bulan');

-- ============================================================
-- 4. ALTER items - Add FK references to new lookup tables
-- ============================================================

-- First migrate existing id_kategori values to use UUIDs if they're currently text
-- (If id_kategori and id_bentuk are currently UUID type but orphaned, skip)
-- If they're NOT UUID type, we add FK constraints after data migration
-- For now we add the columns as optional UUID references

DO $$
BEGIN
  -- Rename old id_kategori to id_kategori_old if it exists as non-UUID type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'id_kategori'
    AND data_type NOT IN ('uuid')
  ) THEN
    ALTER TABLE items RENAME COLUMN id_kategori TO id_kategori_old;
    ALTER TABLE items ADD COLUMN id_kategori UUID REFERENCES item_categories(id);
    ALTER TABLE items ADD COLUMN id_bentuk UUID REFERENCES item_forms(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Column might already be UUID type, just add FK if column exists
  BEGIN
    -- Check if id_kategori is UUID type and has no FK
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'id_kategori' AND data_type = 'uuid'
    ) THEN
      -- Add FK constraint (will fail if existing data doesn't match, so use NOT VALID)
      BEGIN
        ALTER TABLE items ADD CONSTRAINT fk_items_kategori
          FOREIGN KEY (id_kategori) REFERENCES item_categories(id) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE items ADD CONSTRAINT fk_items_bentuk
          FOREIGN KEY (id_bentuk) REFERENCES item_forms(id) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- ============================================================
-- 5. ALTER patients - Add tarikh_daftar (registration date)
-- ============================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS tarikh_daftar DATE;
CREATE INDEX IF NOT EXISTS idx_patients_tarikh_daftar ON patients(tarikh_daftar);

-- ============================================================
-- 6. ALTER patient_item_assignments - Add catatan_penggunaan (usage notes)
-- ============================================================

ALTER TABLE patient_item_assignments ADD COLUMN IF NOT EXISTS catatan_penggunaan TEXT;

-- ============================================================
-- 7. Create a migrated_staff table to track old staff IDs for migration
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_migration_lookup (
  old_id INTEGER PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_migration_old ON staff_migration_lookup(old_id);
CREATE INDEX IF NOT EXISTS idx_staff_migration_profile ON staff_migration_lookup(profile_id);

ALTER TABLE staff_migration_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_migration_select" ON staff_migration_lookup FOR SELECT USING (true);
CREATE POLICY "staff_migration_insert" ON staff_migration_lookup FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_migration_update" ON staff_migration_lookup FOR UPDATE USING (true);

-- ============================================================
-- 8. Update triggers for new tables
-- ============================================================

DROP TRIGGER IF EXISTS update_item_categories_updated_at ON item_categories;
CREATE TRIGGER update_item_categories_updated_at
  BEFORE UPDATE ON item_categories FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_item_forms_updated_at ON item_forms;
CREATE TRIGGER update_item_forms_updated_at
  BEFORE UPDATE ON item_forms FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_supply_durations_updated_at ON supply_durations;
CREATE TRIGGER update_supply_durations_updated_at
  BEFORE UPDATE ON supply_durations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. Add updated_at columns to new tables (post-creation since they were created without them)
-- ============================================================

ALTER TABLE item_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE item_forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE supply_durations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();