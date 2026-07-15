-- Since we moved to custom auth (password hashes in profiles table),
-- Supabase Auth is no longer used. RLS policies that depend on
-- auth.uid() and auth.role() will block all data access.
-- We disable RLS on all tables and rely on application-level auth.

-- Drop all RLS policies first (order matters to avoid dependency errors)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "items_select" ON items;
DROP POLICY IF EXISTS "items_insert" ON items;
DROP POLICY IF EXISTS "items_update" ON items;
DROP POLICY IF EXISTS "items_delete" ON items;
DROP POLICY IF EXISTS "batches_select" ON item_batches;
DROP POLICY IF EXISTS "batches_insert" ON item_batches;
DROP POLICY IF EXISTS "batches_update" ON item_batches;
DROP POLICY IF EXISTS "batches_delete" ON item_batches;
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;
DROP POLICY IF EXISTS "assignments_select" ON patient_item_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON patient_item_assignments;
DROP POLICY IF EXISTS "assignments_update" ON patient_item_assignments;
DROP POLICY IF EXISTS "assignments_delete" ON patient_item_assignments;
DROP POLICY IF EXISTS "supply_select" ON supply_records;
DROP POLICY IF EXISTS "supply_insert" ON supply_records;
DROP POLICY IF EXISTS "supply_update" ON supply_records;
DROP POLICY IF EXISTS "supply_delete" ON supply_records;
DROP POLICY IF EXISTS "dose_select" ON dose_history;
DROP POLICY IF EXISTS "dose_insert" ON dose_history;
DROP POLICY IF EXISTS "dose_update" ON dose_history;
DROP POLICY IF EXISTS "dose_delete" ON dose_history;
DROP POLICY IF EXISTS "users_view_own_requests" ON password_reset_requests;
DROP POLICY IF EXISTS "users_create_requests" ON password_reset_requests;
DROP POLICY IF EXISTS "admins_view_all_requests" ON password_reset_requests;
DROP POLICY IF EXISTS "admins_update_requests" ON password_reset_requests;
DROP POLICY IF EXISTS "users_view_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_notifications" ON notifications;
DROP POLICY IF EXISTS "service_insert_notifications" ON notifications;

-- Disable RLS on all tables
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
