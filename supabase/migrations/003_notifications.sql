-- Notifications Table
-- Stores system-generated notifications for users

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('Pentadbir', 'Penjaga Stor', 'Kakitangan Farmasi', 'Kakitangan Klinik')),
  type TEXT NOT NULL CHECK (type IN (
    'expiry_soon', 'slow_moving', 'quota_full', 'low_stock',
    'password_reset_request', 'password_reset_done',
    'patient_unassigned', 'supply_overdue', 'defaulter_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_role ON notifications(role);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications (by user_id or role match)
CREATE POLICY "users_view_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can mark their notifications as read
CREATE POLICY "users_update_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- System/service role can insert
CREATE POLICY "service_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (true);