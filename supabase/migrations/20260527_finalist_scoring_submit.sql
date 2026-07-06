-- Migration: finalist round scoring submission timestamp
-- Tracks when a stakeholder has submitted their Round 2 (final phase) scores.
-- Separate from scoring_submitted_at which tracks Round 1 (post_meeting).

ALTER TABLE stakeholders
  ADD COLUMN IF NOT EXISTS final_scoring_submitted_at timestamptz;

COMMENT ON COLUMN stakeholders.final_scoring_submitted_at IS
  'Set when the stakeholder submits their Round 2 (finalist) scores.';
