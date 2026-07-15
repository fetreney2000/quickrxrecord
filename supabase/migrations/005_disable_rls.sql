-- Since we moved to custom auth (password hashes in profiles table),
-- Supabase Auth is no longer used. RLS policies that depend on
-- auth.uid() and auth.role() will block all data access.
-- We disable RLS on all tables and rely on application-level auth.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_item_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE supply_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE dose_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop the helper function since it's no longer needed
DROP FUNCTION IF EXISTS get_user_role();