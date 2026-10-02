-- Cross-source contact dedupe for imports.
--
-- Problem: re-importing the same CSV, or importing a phone export after a
-- LinkedIn one, created duplicate contacts because the import route did an
-- unconditional insert. This adds normalized matching columns plus a
-- Postgres function that matches an incoming row against the user's
-- existing contacts (by normalized email, then normalized phone), merges
-- into the match by filling only empty fields, or inserts if there's no
-- match. Existing columns (`source`, etc.) are untouched.

-- Tracks every source a contact's data has come from, not just the first
-- (`source`). Needed so re-importing from a new source appends instead of
-- overwriting.
alter table contacts add column if not exists sources text[] not null default '{}';
update contacts set sources = array[source] where sources = '{}' and source is not null;

-- Generated (not manually maintained) so matching is always consistent with
-- how the columns were normalized, and so they can be indexed directly.
alter table contacts add column if not exists email_normalized text
  generated always as (nullif(lower(trim(email)), '')) stored;
alter table contacts add column if not exists phone_normalized text
  generated always as (nullif(regexp_replace(phone, '[^0-9+]', '', 'g'), '')) stored;

-- Per-user unique on normalized email, only where an email exists — this is
-- the arbiter the upsert in import_upsert_contact() conflicts on.
create unique index if not exists contacts_user_email_normalized_idx
  on contacts (user_id, email_normalized)
  where email_normalized is not null;

-- Phone isn't guaranteed unique the way email is (spec only calls for a
-- unique constraint on email), so this is a plain index for the fallback
-- match lookup in import_upsert_contact(), not a constraint.
create index if not exists contacts_user_phone_normalized_idx
  on contacts (user_id, phone_normalized)
  where phone_normalized is not null;

-- Matches an incoming import row against the user's existing contacts and
-- either merges into the match (filling only empty fields, appending the
-- source) or inserts a new contact. One call per row: each call sees the
-- results of prior calls in the same import, so duplicate rows within a
-- single CSV resolve against each other too, not just against rows already
-- in the database before the import started.
create or replace function import_upsert_contact(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_job_title text,
  p_linkedin_url text,
  p_location text,
  p_industry text,
  p_notes text,
  p_company_id uuid,
  p_source text
) returns table (contact_id uuid, action text)
language plpgsql
as $$
declare
  v_email_normalized text := nullif(lower(trim(p_email)), '');
  v_phone_normalized text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_existing_id uuid;
begin
  if v_email_normalized is not null then
    select id into v_existing_id from contacts c
      where c.user_id = p_user_id and c.email_normalized = v_email_normalized
      limit 1;
  end if;
  if v_existing_id is null and v_phone_normalized is not null then
    select id into v_existing_id from contacts c
      where c.user_id = p_user_id and c.phone_normalized = v_phone_normalized
      limit 1;
  end if;

  if v_existing_id is not null then
    update contacts set
      first_name = coalesce(contacts.first_name, p_first_name),
      last_name = coalesce(contacts.last_name, p_last_name),
      email = coalesce(contacts.email, p_email),
      phone = coalesce(contacts.phone, p_phone),
      job_title = coalesce(contacts.job_title, p_job_title),
      linkedin_url = coalesce(contacts.linkedin_url, p_linkedin_url),
      location = coalesce(contacts.location, p_location),
      industry = coalesce(contacts.industry, p_industry),
      notes = coalesce(contacts.notes, p_notes),
      company_id = coalesce(contacts.company_id, p_company_id),
      sources = case when p_source is null or p_source = any(contacts.sources)
                      then contacts.sources
                      else contacts.sources || p_source end
    where contacts.id = v_existing_id;
    return query select v_existing_id, 'merged'::text;
  else
    insert into contacts (
      user_id, first_name, last_name, email, phone, job_title,
      linkedin_url, location, industry, notes, company_id, source, sources
    ) values (
      p_user_id, p_first_name, p_last_name, p_email, p_phone, p_job_title,
      p_linkedin_url, p_location, p_industry, p_notes, p_company_id, p_source,
      case when p_source is null then '{}'::text[] else array[p_source] end
    ) returning id into v_existing_id;
    return query select v_existing_id, 'inserted'::text;
  end if;
end;
$$;
