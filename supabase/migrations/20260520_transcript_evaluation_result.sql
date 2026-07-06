-- Add evaluation_result column to meeting_transcripts
-- Stores the structured AI evaluation summary (overall impression, scores, etc.)
-- Commitments are stored in the commitments table; this holds the summary.

alter table meeting_transcripts
  add column if not exists evaluation_result jsonb default null;
