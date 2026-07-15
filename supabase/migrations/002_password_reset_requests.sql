-- Password Reset Requests Table
-- Users can submit a request, admins can approve/resolve them

CREATE TABLE password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_reset_requests_status ON password_reset_requests(status);
CREATE INDEX idx_reset_requests_user ON password_reset_requests(user_id);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view their own requests
CREATE POLICY "users_view_own_requests" ON password_reset_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create requests for themselves
CREATE POLICY "users_create_requests" ON password_reset_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "admins_view_all_requests" ON password_reset_requests
  FOR SELECT USING (get_user_role() = 'Pentadbir');

-- Admins can update requests (approve/reject)
CREATE POLICY "admins_update_requests" ON password_reset_requests
  FOR UPDATE USING (get_user_role() = 'Pentadbir');