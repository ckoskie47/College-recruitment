-- Migration: scoring submission timestamp
-- Tracks when a stakeholder has completed and submitted their scores.
-- Used to gate the Compare view (blind scoring) until the viewer is done.

ALTER TABLE stakeholders
  ADD COLUMN IF NOT EXISTS scoring_submitted_at timestamptz;

COMMENT ON COLUMN stakeholders.scoring_submitted_at IS
  'Set when the stakeholder submits their final scores. Null = still scoring.';
