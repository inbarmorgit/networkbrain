-- Cross-source comparison view support.
--
-- import_upsert_contact() has always merged by filling only empty fields,
-- but never recorded *which* source set each field's current value, or
-- noticed when two sources actively disagreed on a field (the merge just
-- keeps the existing value and silently drops the incoming one). Neither
-- is visible anywhere, so there's nothing for a comparison view to show.
--
-- Adds two jsonb columns and rewrites the merge to populate them:
--   field_sources:   {"job_title": "linkedin", "phone": "phone", ...}
--                     which source's import set the field's current value.
--   field_conflicts: {"job_title": [{"source": "phone", "value": "...",
--                     "discarded_at": "..."}]}
--                     values that lost to an existing non-empty value during
--                     a merge, so they're reviewable instead of silently gone.

alter table contacts add column if not exists field_sources jsonb not null default '{}';
alter table contacts add column if not exists field_conflicts jsonb not null default '{}';

-- Generic per-field merge: fills the field from `incoming` if `existing` is
-- empty (recording the source), keeps `existing` if they agree or incoming
-- is empty, or keeps `existing` and logs a conflict if they disagree.
-- Operates on text so it can also be used for company_id via ::text casts.
create or replace function merge_text_field(
  p_field_name text,
  p_existing_value text,
  p_incoming_value text,
  p_source text,
  p_field_sources jsonb,
  p_field_conflicts jsonb,
  out new_value text,
  out new_field_sources jsonb,
  out new_field_conflicts jsonb
)
language plpgsql
as $$
begin
  new_field_sources := p_field_sources;
  new_field_conflicts := p_field_conflicts;

  if p_existing_value is null then
    new_value := p_incoming_value;
    if p_incoming_value is not null then
      new_field_sources := jsonb_set(new_field_sources, array[p_field_name], to_jsonb(p_source));
    end if;
  elsif p_incoming_value is not null and p_incoming_value is distinct from p_existing_value then
    new_value := p_existing_value;
    new_field_conflicts := jsonb_set(
      new_field_conflicts,
      array[p_field_name],
      coalesce(new_field_conflicts->p_field_name, '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object('source', p_source, 'value', p_incoming_value, 'discarded_at', now()))
    );
  else
    new_value := p_existing_value;
  end if;
end;
$$;

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
  v_existing contacts%rowtype;
  v_existing_id uuid;
  v_first_name text; v_last_name text; v_email text; v_phone text; v_job_title text;
  v_linkedin_url text; v_location text; v_industry text; v_notes text; v_company_id_text text;
  v_field_sources jsonb; v_field_conflicts jsonb;
begin
  if v_email_normalized is not null then
    select * into v_existing from contacts c
      where c.user_id = p_user_id and c.email_normalized = v_email_normalized
      limit 1;
  end if;
  if v_existing.id is null and v_phone_normalized is not null then
    select * into v_existing from contacts c
      where c.user_id = p_user_id and c.phone_normalized = v_phone_normalized
      limit 1;
  end if;

  if v_existing.id is not null then
    v_field_sources := v_existing.field_sources;
    v_field_conflicts := v_existing.field_conflicts;

    select new_value, new_field_sources, new_field_conflicts into v_first_name, v_field_sources, v_field_conflicts
      from merge_text_field('first_name', v_existing.first_name, p_first_name, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_last_name, v_field_sources, v_field_conflicts
      from merge_text_field('last_name', v_existing.last_name, p_last_name, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_email, v_field_sources, v_field_conflicts
      from merge_text_field('email', v_existing.email, p_email, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_phone, v_field_sources, v_field_conflicts
      from merge_text_field('phone', v_existing.phone, p_phone, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_job_title, v_field_sources, v_field_conflicts
      from merge_text_field('job_title', v_existing.job_title, p_job_title, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_linkedin_url, v_field_sources, v_field_conflicts
      from merge_text_field('linkedin_url', v_existing.linkedin_url, p_linkedin_url, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_location, v_field_sources, v_field_conflicts
      from merge_text_field('location', v_existing.location, p_location, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_industry, v_field_sources, v_field_conflicts
      from merge_text_field('industry', v_existing.industry, p_industry, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_notes, v_field_sources, v_field_conflicts
      from merge_text_field('notes', v_existing.notes, p_notes, p_source, v_field_sources, v_field_conflicts);
    select new_value, new_field_sources, new_field_conflicts into v_company_id_text, v_field_sources, v_field_conflicts
      from merge_text_field('company_id', v_existing.company_id::text, p_company_id::text, p_source, v_field_sources, v_field_conflicts);

    update contacts set
      first_name = v_first_name, last_name = v_last_name, email = v_email, phone = v_phone,
      job_title = v_job_title, linkedin_url = v_linkedin_url, location = v_location,
      industry = v_industry, notes = v_notes, company_id = v_company_id_text::uuid,
      field_sources = v_field_sources, field_conflicts = v_field_conflicts,
      sources = case when p_source is null or p_source = any(contacts.sources)
                      then contacts.sources
                      else contacts.sources || p_source end
    where contacts.id = v_existing.id;
    return query select v_existing.id, 'merged'::text;
  else
    v_field_sources := '{}'::jsonb;
    if p_first_name is not null then v_field_sources := jsonb_set(v_field_sources, '{first_name}', to_jsonb(p_source)); end if;
    if p_last_name is not null then v_field_sources := jsonb_set(v_field_sources, '{last_name}', to_jsonb(p_source)); end if;
    if p_email is not null then v_field_sources := jsonb_set(v_field_sources, '{email}', to_jsonb(p_source)); end if;
    if p_phone is not null then v_field_sources := jsonb_set(v_field_sources, '{phone}', to_jsonb(p_source)); end if;
    if p_job_title is not null then v_field_sources := jsonb_set(v_field_sources, '{job_title}', to_jsonb(p_source)); end if;
    if p_linkedin_url is not null then v_field_sources := jsonb_set(v_field_sources, '{linkedin_url}', to_jsonb(p_source)); end if;
    if p_location is not null then v_field_sources := jsonb_set(v_field_sources, '{location}', to_jsonb(p_source)); end if;
    if p_industry is not null then v_field_sources := jsonb_set(v_field_sources, '{industry}', to_jsonb(p_source)); end if;
    if p_notes is not null then v_field_sources := jsonb_set(v_field_sources, '{notes}', to_jsonb(p_source)); end if;
    if p_company_id is not null then v_field_sources := jsonb_set(v_field_sources, '{company_id}', to_jsonb(p_source)); end if;

    insert into contacts (
      user_id, first_name, last_name, email, phone, job_title,
      linkedin_url, location, industry, notes, company_id, source, sources, field_sources
    ) values (
      p_user_id, p_first_name, p_last_name, p_email, p_phone, p_job_title,
      p_linkedin_url, p_location, p_industry, p_notes, p_company_id, p_source,
      case when p_source is null then '{}'::text[] else array[p_source] end,
      v_field_sources
    ) returning id into v_existing_id;
    return query select v_existing_id, 'inserted'::text;
  end if;
end;
$$;
