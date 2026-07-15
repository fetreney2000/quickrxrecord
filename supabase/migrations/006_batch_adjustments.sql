-- Audit log for batch quantity adjustments
CREATE TABLE batch_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES item_batches(id) ON DELETE CASCADE,
  previous_kuantiti INTEGER NOT NULL,
  new_kuantiti INTEGER NOT NULL,
  change INTEGER NOT NULL, -- positive = increase, negative = decrease
  reason TEXT,
  adjusted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_adjustments_batch ON batch_adjustments(batch_id);
CREATE INDEX idx_batch_adjustments_created ON batch_adjustments(created_at DESC);

ALTER TABLE batch_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select_adjustments" ON batch_adjustments FOR SELECT USING (true);
CREATE POLICY "all_insert_adjustments" ON batch_adjustments FOR INSERT WITH CHECK (true);