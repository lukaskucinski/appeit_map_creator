-- ============================================================================
-- Fix: Update user_stats trigger to properly handle DELETE operations
-- ============================================================================
-- This ensures maps_completed_active counter decrements when users delete jobs

CREATE OR REPLACE FUNCTION update_user_stats_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip trigger for anonymous jobs (NULL user_id) except for DELETE
  IF TG_OP != 'DELETE' AND NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Also skip DELETE for anonymous jobs
  IF TG_OP = 'DELETE' AND OLD.user_id IS NULL THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Job created in jobs_active
    IF NEW.status = 'complete' THEN
      INSERT INTO user_stats (user_id, maps_completed_active, updated_at)
      VALUES (NEW.user_id, 1, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET maps_completed_active = user_stats.maps_completed_active + 1,
          updated_at = NOW();
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed to complete
    IF OLD.status != 'complete' AND NEW.status = 'complete' THEN
      UPDATE user_stats
      SET maps_completed_active = maps_completed_active + 1,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Job deleted or expired from jobs_active
    -- Decrement counter if the deleted job was completed
    IF OLD.status = 'complete' THEN
      UPDATE user_stats
      SET maps_completed_active = GREATEST(0, maps_completed_active - 1),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;