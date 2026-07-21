-- Inventory Transactions (Rekod Transaksi Inventori)
-- Tracks all stock movements (masuk/keluar) for audit trail

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id),
  batch_id UUID REFERENCES item_batches(id),
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
  kuantiti INTEGER NOT NULL CHECK (kuantiti > 0),
  rujukan_id UUID,
  rujukan_type TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_trans_item ON inventory_transactions(item_id);
CREATE INDEX idx_inv_trans_batch ON inventory_transactions(batch_id);
CREATE INDEX idx_inv_trans_created ON inventory_transactions(created_at DESC);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_trans_select" ON inventory_transactions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inv_trans_insert" ON inventory_transactions
  FOR INSERT WITH CHECK (get_user_role() IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi'));

-- ============================================================
-- UPDATE process_supply to record inventory transactions
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
  v_item_id UUID;
BEGIN
  -- Get item_id from assignment
  SELECT item_id INTO v_item_id
  FROM patient_item_assignments
  WHERE id = p_assignment_id;

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

  -- Record inventory transaction (keluar)
  INSERT INTO inventory_transactions (item_id, batch_id, jenis, kuantiti, rujukan_id, rujukan_type, catatan)
  VALUES (v_item_id, p_batch_id, 'keluar', p_kuantiti, v_supply_id, 'supply', 'Pembekalan kepada pesakit');

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
