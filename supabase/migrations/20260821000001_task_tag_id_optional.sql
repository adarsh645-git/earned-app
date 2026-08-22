-- Inbox tasks (GTD Capture, not yet Clarified) have no tag assigned.
-- See docs/sdd/026-gtd-inbox-clarify-review.md.
ALTER TABLE public.tasks ALTER COLUMN tag_id DROP NOT NULL;
