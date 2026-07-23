-- Server-side function to count active assignments per item
-- Avoids the 1000-row PostgREST default page limit that truncates client-side results
CREATE OR REPLACE FUNCTION count_active_assignments()
RETURNS TABLE(item_id UUID, active_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pia.item_id, COUNT(*)::BIGINT
  FROM patient_item_assignments pia
  WHERE pia.aktif = true
  GROUP BY pia.item_id;
END;
$$;
