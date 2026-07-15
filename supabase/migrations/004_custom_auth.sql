-- Add password hash column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kata_laluan_hash TEXT;

-- Ensure RLS policy allows reading profiles for auth purposes
-- (already exists: profiles_select policy allows all authenticated users)

-- Admin function to update password hash directly
CREATE OR REPLACE FUNCTION update_password_hash(
  p_user_id UUID,
  p_new_hash TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET kata_laluan_hash = p_new_hash, updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;