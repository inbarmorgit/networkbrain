-- Fixes an interaction bug between phone-only import rows and merge: the
-- import route was writing the phone number directly into `first_name` as a
-- display-name fallback, but import_upsert_contact()'s merge only fills
-- *empty* fields — so once a contact had "555-123-4567" sitting in
-- first_name, a later import with the person's real name could never
-- overwrite it (first_name was "already filled", from the merge's point of
-- view).
--
-- Fix: move the phone fallback into the full_name generated column itself,
-- and stop writing to first_name at all for phone-only rows (see the
-- matching app/api/import/route.ts change). first_name/last_name now stay
-- genuinely empty until a real name is known, so a later import can still
-- fill them in.

alter table contacts drop column full_name;
alter table contacts add column full_name text generated always as (
  coalesce(
    nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
    phone
  )
) stored;
