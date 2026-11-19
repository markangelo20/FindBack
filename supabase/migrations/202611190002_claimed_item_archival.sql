-- FindBack: remove a completed claim from public history without
-- deleting claim audit events, claimant evidence, or chat relationships.
-- Requires existing private.findback_is_student(),
-- private.findback_claim_history(), public.findback_claimed_history().
-- Apply after reviewing/testing on a staging copy first.

BEGIN;

CREATE TABLE IF NOT EXISTS private.findback_claim_removals (
  claim_id uuid PRIMARY KEY
    REFERENCES public.findback_claims(id) ON DELETE CASCADE,
  removed_by uuid NOT NULL REFERENCES auth.users(id),
  removed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.findback_claim_removals ENABLE ROW LEVEL SECURITY;

-- No direct client table access; RPCs below are the sole write path.
REVOKE ALL ON TABLE private.findback_claim_removals
  FROM PUBLIC, anon, authenticated;

-- Private existence check used by the existing public history RPC.
CREATE OR REPLACE FUNCTION private.findback_claim_is_removed(
  p_claim uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.findback_claim_removals AS removal
    WHERE removal.claim_id = p_claim
  );
$$;

REVOKE ALL ON FUNCTION private.findback_claim_is_removed(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.findback_claim_is_removed(uuid)
  TO authenticated;

-- Preserve the original private history function and its name-sharing
-- consent checks, filtering hidden entries in the public wrapper only.
CREATE OR REPLACE FUNCTION public.findback_claimed_history()
RETURNS TABLE (
  claim_id uuid,
  item_name text,
  item_category text,
  claimant_display text,
  finder_display text,
  claimed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT history.*
  FROM private.findback_claim_history() AS history
  WHERE NOT private.findback_claim_is_removed(history.claim_id);
$$;

REVOKE ALL ON FUNCTION public.findback_claimed_history()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.findback_claimed_history()
  TO authenticated;

-- This permanently removes a completed item from public Claimed Items.
-- Only the finder who owns the FOUND report can call this function.
-- It does not destroy claims, private ownership proofs, or audit events.
CREATE OR REPLACE FUNCTION public.findback_remove_claimed_item(
  p_claim uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
BEGIN
  IF v_user IS NULL OR NOT private.findback_is_student() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.findback_claims AS claim
    JOIN public.findback_reports AS report
      ON report.id = claim.found_report_id
    WHERE claim.id = p_claim
      AND claim.status = 'claimed'
      AND claim.finder_id = v_user
      AND report.owner_id = v_user
      AND report.item_type = 'found'
      AND report.status = 'returned'
  ) THEN
    RAISE EXCEPTION 'Only the owner of a completed Found report may remove this item';
  END IF;

  INSERT INTO private.findback_claim_removals (claim_id, removed_by)
  VALUES (p_claim, v_user)
  ON CONFLICT (claim_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.findback_remove_claimed_item(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.findback_remove_claimed_item(uuid)
  TO authenticated;

COMMIT;
