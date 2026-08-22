-- Weekly Review (GTD Reflect) cadence tracking.
-- See docs/sdd/026-gtd-inbox-clarify-review.md.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
