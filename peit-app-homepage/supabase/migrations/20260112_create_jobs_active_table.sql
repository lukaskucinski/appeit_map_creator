-- Migration: Create jobs_active table and add maps_completed_active column
-- Date: 2026-01-12
-- Description: Implements 7-day sliding window for active jobs with valid storage

-- ============================================================================
-- 1. CREATE jobs_active TABLE
-- ============================================================================

CREATE TABLE jobs_active (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- User association
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job metadata
  filename TEXT NOT NULL,
  project_name TEXT,
  project_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing', 'complete', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  blob_uploaded_at TIMESTAMPTZ,
  status_updated_at TIMESTAMPTZ,

  -- Results metadata
  total_features INTEGER,
  layers_with_data INTEGER,
  input_area_sq_miles REAL,

  -- URLs to resources
  map_url TEXT,
  map_blob_url TEXT,
  pdf_url TEXT,
  xlsx_url TEXT,
  zip_download_path TEXT,

  -- Error information
  error_message TEXT,

  -- Performance metrics
  rcra_feature_count INTEGER,
  npdes_feature_count INTEGER,
  wetlands_feature_count INTEGER,
  total_runtime_seconds REAL,
  geometry_processing_seconds REAL,
  layer_querying_seconds REAL,
  total_layers_queried INTEGER,
  initial_prediction_seconds REAL,
  final_prediction_seconds REAL,
  prediction_error_seconds REAL,

  -- Generated column
  execution_time_seconds REAL GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - created_at))
  ) STORED
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_jobs_active_user_id ON jobs_active(user_id);
CREATE INDEX idx_jobs_active_created_at ON jobs_active(created_at DESC);
CREATE INDEX idx_jobs_active_expires_at ON jobs_active(expires_at);
CREATE INDEX idx_jobs_active_blob_uploaded_at ON jobs_active(blob_uploaded_at);
CREATE INDEX idx_jobs_active_status ON jobs_active(status);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE jobs_active ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own active jobs
CREATE POLICY "Users can view own active jobs"
  ON jobs_active FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. ADD maps_completed_active COLUMN TO user_stats
-- ============================================================================

ALTER TABLE user_stats
ADD COLUMN maps_completed_active INTEGER DEFAULT 0 NOT NULL;

-- ============================================================================
-- 5. CREATE TRIGGER FUNCTION FOR user_stats.maps_completed_active
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_stats_active()
RETURNS TRIGGER AS $$
BEGIN
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

-- ============================================================================
-- 6. CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_update_user_stats_active
AFTER INSERT OR UPDATE OR DELETE ON jobs_active
FOR EACH ROW EXECUTE FUNCTION update_user_stats_active();

-- ============================================================================
-- 7. CREATE AUTO-CLEANUP FUNCTION (optional - Modal handles this)
-- ============================================================================

-- Note: This function is optional. The Modal backend's scheduled cleanup
-- already handles deletion from jobs_active. Include this only if you want
-- database-level auto-cleanup as a backup mechanism (requires pg_cron extension).

CREATE OR REPLACE FUNCTION cleanup_expired_jobs_active()
RETURNS void AS $$
BEGIN
  DELETE FROM jobs_active
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment below to schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule(
--   'cleanup-expired-jobs-active',
--   '5 3 * * *',  -- 3:05 AM UTC daily (5 min after Modal cleanup)
--   'SELECT cleanup_expired_jobs_active();'
-- );

-- ============================================================================
-- 8. BACKFILL jobs_active WITH UNEXPIRED JOBS
-- ============================================================================

-- Copy jobs created within last 7 days to jobs_active table
INSERT INTO jobs_active
SELECT * FROM jobs
WHERE created_at > NOW() - INTERVAL '7 days'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. INITIALIZE maps_completed_active COUNTER
-- ============================================================================

-- Calculate initial maps_completed_active for existing users
UPDATE user_stats
SET maps_completed_active = (
  SELECT COUNT(*)
  FROM jobs_active
  WHERE jobs_active.user_id = user_stats.user_id
    AND jobs_active.status = 'complete'
),
updated_at = NOW();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify results:
-- SELECT COUNT(*) FROM jobs_active;  -- Should show unexpired jobs
-- SELECT user_id, maps_completed, maps_completed_active FROM user_stats;
