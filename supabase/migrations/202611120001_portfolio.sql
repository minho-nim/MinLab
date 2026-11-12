begin;
-- Run once in the owner's Supabase SQL editor. No service-role key goes to Vite.
create table public.portfolio_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.portfolio_admins enable row level security;
create policy "admins may see own membership" on public.portfolio_admins for select to authenticated using (user_id = auth.uid());
create function public.is_portfolio_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.portfolio_admins where user_id = auth.uid());
$$;
create table public.portfolio_drafts (
  id text primary key check (id = 'portfolio'), about text, content jsonb not null default '[]',
  revision integer not null default 0, updated_at timestamptz not null default now()
);
create table public.portfolio_public (
  id text primary key check (id = 'portfolio'), about text, content jsonb not null,
  revision integer not null, updated_at timestamptz not null default now()
);
create table public.portfolio_backups (
  id bigint generated always as identity primary key, source text not null check (source in ('draft', 'public')), about text, content jsonb not null,
  revision integer not null, recorded_at timestamptz not null default now(), actor uuid references auth.users(id)
);
insert into public.portfolio_drafts(id) values ('portfolio');
alter table public.portfolio_drafts enable row level security;
alter table public.portfolio_public enable row level security;
alter table public.portfolio_backups enable row level security;
create policy "admin draft read" on public.portfolio_drafts for select to authenticated using (public.is_portfolio_admin());
create policy "visitor public read" on public.portfolio_public for select to anon, authenticated using (true);
create policy "admin backup read" on public.portfolio_backups for select to authenticated using (public.is_portfolio_admin());
revoke all on public.portfolio_admins, public.portfolio_drafts, public.portfolio_public, public.portfolio_backups from public, anon, authenticated;
grant select on public.portfolio_admins, public.portfolio_drafts, public.portfolio_public, public.portfolio_backups to authenticated;
grant select on public.portfolio_public to anon;
revoke insert, update, delete on public.portfolio_admins, public.portfolio_drafts, public.portfolio_public, public.portfolio_backups from public, anon, authenticated;

create function public.save_portfolio_draft(payload jsonb, expected_revision integer, about_text text default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer; next_revision integer;
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege using message = 'admin_required'; end if;
  if payload is null or jsonb_typeof(payload) <> 'array' or octet_length(payload::text) > 15000000 or length(about_text) > 20000 then
    raise exception 'invalid_payload';
  end if;
  if exists(select 1 from jsonb_array_elements(payload) p where
    jsonb_typeof(p) <> 'object' or coalesce(jsonb_typeof(p->'id'),'') <> 'string' or coalesce(p->>'id','') = '' or
    coalesce(jsonb_typeof(p->'name'),'') <> 'string' or
    coalesce(jsonb_typeof(p->'category'),'') <> 'string' or coalesce(jsonb_typeof(p->'description'),'') <> 'string' or coalesce(jsonb_typeof(p->'status'),'') <> 'string' or
    coalesce(jsonb_typeof(p->'keyFeatures'),'') <> 'array' or coalesce(jsonb_typeof(p->'changelog'),'') <> 'array' or
    coalesce(jsonb_typeof(p->'workLogs'),'') <> 'array' or coalesce(jsonb_typeof(p->'techStack'),'') <> 'array') then
    raise exception 'invalid_project';
  end if;
  if (select count(*) from jsonb_array_elements(payload)) <> (select count(distinct p->>'id') from jsonb_array_elements(payload) p) then
    raise exception 'duplicate_project_id';
  end if;
  select revision into current_revision from public.portfolio_drafts where id = 'portfolio' for update;
  if current_revision is distinct from expected_revision then raise exception 'revision_conflict'; end if;
  insert into public.portfolio_backups(content, about, revision, actor, source)
    select content, about, revision, auth.uid(), 'draft' from public.portfolio_drafts where id = 'portfolio';
  update public.portfolio_drafts set content = payload, about = about_text, revision = revision + 1, updated_at = now()
    where id = 'portfolio' returning revision into next_revision;
  return next_revision;
end; $$;
create function public.publish_portfolio_draft(expected_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer; draft jsonb; draft_about text; visible_content jsonb;
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege using message = 'admin_required'; end if;
  select revision, content, about into current_revision, draft, draft_about from public.portfolio_drafts where id = 'portfolio' for update;
  if current_revision is distinct from expected_revision then raise exception 'revision_conflict'; end if;
  select coalesce(jsonb_agg(p order by ordinal), '[]'::jsonb) into visible_content
    from jsonb_array_elements(draft) with ordinality as entries(p, ordinal)
    where coalesce(p->>'visible','true') <> 'false' and coalesce(p->>'archived','false') <> 'true';
  insert into public.portfolio_backups(content, about, revision, actor, source)
    select content, about, revision, auth.uid(), 'public' from public.portfolio_public where id = 'portfolio';
  insert into public.portfolio_public(id, content, about, revision) values ('portfolio', visible_content, draft_about, current_revision + 1)
    on conflict(id) do update set content = excluded.content, about = excluded.about, revision = excluded.revision, updated_at = now();
  update public.portfolio_drafts set revision = revision + 1, updated_at = now() where id = 'portfolio';
  return current_revision + 1;
end; $$;
revoke all on function public.save_portfolio_draft(jsonb, integer, text), public.publish_portfolio_draft(integer) from public, anon;
grant execute on function public.save_portfolio_draft(jsonb, integer, text), public.publish_portfolio_draft(integer) to authenticated;

commit;
