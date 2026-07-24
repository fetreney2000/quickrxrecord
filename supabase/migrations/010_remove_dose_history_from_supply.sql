-- Remove dose_history INSERT and dose UPDATE from process_supply
-- Dose history is now tracked client-side only for initial assignment creation
-- Updating the dose on every supply was causing duplicate entries and
-- incorrectly overwriting prescription dose changes on each dispense event

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
  SELECT item_id INTO v_item_id
  FROM patient_item_assignments
  WHERE id = p_assignment_id;

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

  UPDATE item_batches
  SET kuantiti = kuantiti - p_kuantiti
  WHERE id = p_batch_id;

  INSERT INTO supply_records (
    assignment_id, dos, tempoh_dibekal, kuantiti, batch_id, kakitangan_pembekal, catatan_bekalan
  ) VALUES (
    p_assignment_id, p_dos, p_tempoh_dibekal, p_kuantiti, p_batch_id, p_kakitangan_pembekal, p_catatan_bekalan
  ) RETURNING id INTO v_supply_id;

  INSERT INTO inventory_transactions (item_id, batch_id, jenis, kuantiti, rujukan_id, rujukan_type, catatan)
  VALUES (v_item_id, p_batch_id, 'keluar', p_kuantiti, v_supply_id, 'supply', 'Pembekalan kepada pesakit');

  RETURN v_supply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
