-- Add email_followup to the transcript_source enum.
-- Postgres requires a separate ALTER TYPE statement per new value.
-- This is safe to run multiple times (the IF NOT EXISTS guard is not supported
-- for ADD VALUE in older Postgres versions, so wrap in a DO block).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'email_followup'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transcript_source')
  ) THEN
    ALTER TYPE transcript_source ADD VALUE 'email_followup';
  END IF;
END;
$$;
