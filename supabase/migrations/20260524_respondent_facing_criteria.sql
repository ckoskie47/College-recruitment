-- Migration: respondent-facing criteria columns
-- Adds human-readable question text and listening hints to each criterion.
-- The AI pipeline continues to use the technical criterion name unchanged.

ALTER TABLE criteria
  ADD COLUMN IF NOT EXISTS respondent_question TEXT,
  ADD COLUMN IF NOT EXISTS listen_for_hint     TEXT,
  ADD COLUMN IF NOT EXISTS internal_name       TEXT;

-- Backfill internal_name from existing name field
UPDATE criteria SET internal_name = name WHERE internal_name IS NULL;

COMMENT ON COLUMN criteria.name           IS 'Display label — short technical name';
COMMENT ON COLUMN criteria.internal_name  IS 'Original technical criterion — used by AI for document analysis';
COMMENT ON COLUMN criteria.respondent_question IS 'Stakeholder-facing question for post-meeting scoring';
COMMENT ON COLUMN criteria.listen_for_hint     IS 'Sub-prompt below the question — what good looks like';

-- ---------------------------------------------------------------------------
-- RFP Compliance & Responsiveness (20%)
-- ---------------------------------------------------------------------------

UPDATE criteria SET
  respondent_question = 'Did the presentation cover everything we asked them to address in our RFP?',
  listen_for_hint     = 'Did they miss topics, skip sections, or only talk about their strengths?'
WHERE internal_name = 'Every numbered RFP question answered in order';

UPDATE criteria SET
  respondent_question = 'Did they come prepared with the right materials, data, and references to back up their answers?',
  listen_for_hint     = 'Did they have specific examples, sample reports, and exhibits — or just talking points?'
WHERE internal_name = 'All required attachments provided';

UPDATE criteria SET
  respondent_question = 'Did they respect our process — show up on time, follow our format, meet our deadlines?',
  listen_for_hint     = 'Did the firm act like a professional partner from the first interaction?'
WHERE internal_name = 'Format and submission deadline met';

UPDATE criteria SET
  respondent_question = 'Did they speak specifically to our company and situation, or did the presentation feel generic?',
  listen_for_hint     = 'Did they reference our actual data, plans, employees, and locations — or could this presentation have been given to any company?'
WHERE internal_name = 'Responses specific to client, not boilerplate';

UPDATE criteria SET
  respondent_question = 'When they explained how they get paid, was it clear and complete — or were you left with questions?',
  listen_for_hint     = 'Did you walk away knowing exactly what they earn from every source, or was anything fuzzy or hedged?'
WHERE internal_name = 'Pricing transparent, complete, no "may receive"';

-- ---------------------------------------------------------------------------
-- Contract (20%)
-- ---------------------------------------------------------------------------

UPDATE criteria SET
  respondent_question = 'Do you trust them to deeply review and renegotiate our existing vendor contracts on our behalf?',
  listen_for_hint     = 'Did they show actual examples of finding savings or fixing problems in client vendor contracts?'
WHERE internal_name = 'Provision-level review of TPA, PBM, stop-loss, network';

UPDATE criteria SET
  respondent_question = 'Did they demonstrate they can find hidden fees, restrictions, or unfavorable terms in vendor agreements?',
  listen_for_hint     = 'Did they bring up specific things to look for, or just say "we review contracts"?'
WHERE internal_name = 'Identification of gag clauses & revenue retention';

UPDATE criteria SET
  respondent_question = 'Do they have a clear system for tracking and managing all of our vendor relationships in one place?',
  listen_for_hint     = 'Did they show you a tool or process — or did it sound like it''s all in someone''s head?'
WHERE internal_name = 'Centralized vendor contract repository';

UPDATE criteria SET
  respondent_question = 'Will they catch it when a vendor quietly changes contract terms on us mid-year?',
  listen_for_hint     = 'Did they describe how they monitor for amendments, or just react at renewal time?'
WHERE internal_name = 'Active monitoring of unilateral amendments';

UPDATE criteria SET
  respondent_question = 'Are the terms of working with them fair and clear from what they showed you?',
  listen_for_hint     = 'Did they walk through their engagement letter, or rely on "we''ll figure it out later"?'
WHERE internal_name = 'Quality of broker''s own engagement letter';

-- ---------------------------------------------------------------------------
-- Compliance (20%)
-- ---------------------------------------------------------------------------

UPDATE criteria SET
  respondent_question = 'Will they tell you, in actual dollars, exactly what they get paid from every source — every year, in writing?',
  listen_for_hint     = 'Did they commit to a specific dollar disclosure, or talk in percentages and assurances?'
WHERE internal_name = 'Written 408(b)(2) disclosure in actual dollars';

UPDATE criteria SET
  respondent_question = 'Will they help us meet our annual federal compliance attestation requirements?',
  listen_for_hint     = 'Did they show a process or sample work product for the annual filings?'
WHERE internal_name = 'GCPCA attestation support — active gag-clause identification';

UPDATE criteria SET
  respondent_question = 'Are they willing to put their fiduciary responsibility to us in writing — and stand behind it?',
  listen_for_hint     = 'Did they say yes, say no, or dodge the question? Did anyone press them on this?'
WHERE internal_name = 'Willingness to accept ERISA §3(21)/§3(38) status';

UPDATE criteria SET
  respondent_question = 'Did they disclose any past or current legal issues involving how their firm gets paid?',
  listen_for_hint     = 'Did the topic of broker lawsuits or compensation litigation even come up?'
WHERE internal_name = 'Active ERISA litigation exposure on compensation';

UPDATE criteria SET
  respondent_question = 'Do you trust them to keep us compliant on day-to-day regulatory work — ACA filings, HIPAA, plan documents, mental health parity?',
  listen_for_hint     = 'Did they show specific examples of compliance work product, or just say "we have a compliance team"?'
WHERE internal_name = 'ACA, RxDC, HIPAA, plan documents, testing';

-- ---------------------------------------------------------------------------
-- Insurance (20%)
-- ---------------------------------------------------------------------------

UPDATE criteria SET
  respondent_question = 'Did they show they can find errors or gaps in our stop-loss coverage that could be costing us money?',
  listen_for_hint     = 'Did they reference specific provisions to review — or just say "we look at it"?'
WHERE internal_name = 'Stop-loss attachment & Claims-Paid definition audit';

UPDATE criteria SET
  respondent_question = 'Did they show how they push back when carriers raise rates aggressively?',
  listen_for_hint     = 'Did they bring real examples of negotiating renewals down, or was the talk theoretical?'
WHERE internal_name = 'Response to recent rate increases / renewal posture';

UPDATE criteria SET
  respondent_question = 'Did they give you a real, dollar-specific picture of how they would save us money?',
  listen_for_hint     = 'Did they project actual savings ranges for our situation, or was it generic "we save clients money"?'
WHERE internal_name = 'Renewal track record & cost-containment specificity';

UPDATE criteria SET
  respondent_question = 'Do they have the clinical expertise to actively manage our most expensive cases — not just report on them?',
  listen_for_hint     = 'Did they describe an actual clinical team, or rely on a third-party vendor''s tool?'
WHERE internal_name = 'Independent clinical review of high-cost claimants';

UPDATE criteria SET
  respondent_question = 'Will they make sure our pharmacy benefit and claims processing are being administered correctly — and catch errors when they happen?',
  listen_for_hint     = 'Did they talk about audit rights, audit experience, and recovery — or just monitoring?'
WHERE internal_name = 'PBM audit + Payment Integrity audit';

-- ---------------------------------------------------------------------------
-- Experience (20%)
-- ---------------------------------------------------------------------------

UPDATE criteria SET
  respondent_question = 'Did you meet the actual people who would be working with us day-to-day — and did they impress you?',
  listen_for_hint     = 'Were the names and faces in the room the same ones you''d be calling at 4pm on a Friday?'
WHERE internal_name = 'Dedicated, named, locally-based team with backup';

UPDATE criteria SET
  respondent_question = 'Are you confident they can handle our open enrollment — meetings across multiple sites, materials, multiple languages?',
  listen_for_hint     = 'Did they describe specific OE experience at companies like ours, or generic "we do OE"?'
WHERE internal_name = 'Open enrollment — meetings, materials, bilingual';

UPDATE criteria SET
  respondent_question = 'Will they be available to our HR team year-round, not just at renewal?',
  listen_for_hint     = 'Did they describe a real service cadence with specifics, or just say "we''re always available"?'
WHERE internal_name = 'Year-round HR support — handbook, training, hours';

UPDATE criteria SET
  respondent_question = 'Did they show you how they measure their own service quality — and would those measures hold them accountable?',
  listen_for_hint     = 'Did they share specific numbers (response times, retention rates, NPS), or rely on testimonials?'
WHERE internal_name = 'Service KPIs — SLA, retention rate, NPS';

UPDATE criteria SET
  respondent_question = 'Do they have real tools and people to help our employees directly — not just our HR team?',
  listen_for_hint     = 'Did they show technology, advocacy services, or just claim "we support members"?'
WHERE internal_name = 'Employee-facing technology & member advocacy';
