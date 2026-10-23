-- Wasteland Defense account and progression schema.
-- Run this once in Supabase Dashboard > SQL Editor.

create table if not exists public.player_profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique
        check (username = lower(username) and username ~ '^[a-z0-9_]{3,18}$'),
    callsign text not null default 'DEFENDER'
        check (char_length(callsign) between 1 and 18),
    portrait_id text not null default 'mason',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.player_progress (
    user_id uuid primary key references public.player_profiles (id) on delete cascade,
    coins integer not null default 0 check (coins >= 0),
    unlocked_survivors text[] not null default array[
        'mason', 'james', 'cody', 'britney', 'zach', 'brady'
    ]::text[],
    completed_campaign_levels smallint[] not null default '{}'::smallint[]
        check (completed_campaign_levels <@ array[1, 2, 3, 4, 5, 6]::smallint[]),
    legacy_imported_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.player_progress
    add column if not exists legacy_imported_at timestamptz;

create table if not exists public.endless_scores (
    user_id uuid not null references public.player_profiles (id) on delete cascade,
    map_id smallint not null check (map_id between 1 and 6),
    best_wave integer not null default 0 check (best_wave >= 0),
    updated_at timestamptz not null default now(),
    primary key (user_id, map_id)
);

create table if not exists public.campaign_reward_events (
    user_id uuid not null references public.player_profiles (id) on delete cascade,
    run_id uuid not null,
    level_id smallint not null check (level_id between 1 and 6),
    coins_awarded integer not null check (coins_awarded >= 0),
    awarded_at timestamptz not null default now(),
    primary key (user_id, run_id)
);

create table if not exists public.player_friendships (
    requester_id uuid not null references public.player_profiles (id) on delete cascade,
    addressee_id uuid not null references public.player_profiles (id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (requester_id, addressee_id),
    check (requester_id <> addressee_id)
);

create index if not exists endless_scores_map_rank_idx
    on public.endless_scores (map_id, best_wave desc, updated_at asc);
create index if not exists player_friendships_addressee_idx
    on public.player_friendships (addressee_id, status);

alter table public.player_profiles enable row level security;
alter table public.player_progress enable row level security;
alter table public.endless_scores enable row level security;
alter table public.campaign_reward_events enable row level security;
alter table public.player_friendships enable row level security;

grant select on public.player_profiles to anon, authenticated;
grant update (callsign, portrait_id, updated_at) on public.player_profiles to authenticated;
grant select on public.player_progress to authenticated;
grant select on public.endless_scores to anon, authenticated;
grant select, insert on public.player_friendships to authenticated;
grant update (status, updated_at) on public.player_friendships to authenticated;

drop policy if exists "Public can read leaderboard profiles" on public.player_profiles;
create policy "Public can read leaderboard profiles"
    on public.player_profiles for select to anon, authenticated
    using (true);

drop policy if exists "Players update their own profile" on public.player_profiles;
create policy "Players update their own profile"
    on public.player_profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Players read their own progress" on public.player_progress;
create policy "Players read their own progress"
    on public.player_progress for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Public can read endless scores" on public.endless_scores;
create policy "Public can read endless scores"
    on public.endless_scores for select to anon, authenticated
    using (true);

drop policy if exists "Players read their own friend links" on public.player_friendships;
create policy "Players read their own friend links"
    on public.player_friendships for select to authenticated
    using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "Players send friend requests" on public.player_friendships;
create policy "Players send friend requests"
    on public.player_friendships for insert to authenticated
    with check (
        (select auth.uid()) = requester_id
        and requester_id <> addressee_id
        and status = 'pending'
    );

drop policy if exists "Recipients accept or decline requests" on public.player_friendships;
create policy "Recipients accept or decline requests"
    on public.player_friendships for update to authenticated
    using ((select auth.uid()) = addressee_id and status = 'pending')
    with check ((select auth.uid()) = addressee_id and status in ('accepted', 'declined'));

create or replace function public.create_player_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
    if v_username !~ '^[a-z0-9_]{3,18}$' then
        v_username := 'player_' || left(replace(new.id::text, '-', ''), 12);
    end if;

    insert into public.player_profiles (id, username, callsign)
    values (new.id, v_username, coalesce(nullif(new.raw_user_meta_data ->> 'callsign', ''), v_username));

    insert into public.player_progress (user_id)
    values (new.id);

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_player_records on auth.users;
create trigger on_auth_user_created_player_records
    after insert on auth.users
    for each row execute function public.create_player_records();

create or replace function public.submit_endless_score(p_map_id integer, p_best_wave integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Sign in before submitting a score.';
    end if;
    if p_map_id not between 1 and 6 or p_best_wave < 0 then
        raise exception 'Invalid endless score.';
    end if;

    insert into public.endless_scores (user_id, map_id, best_wave)
    values (v_user_id, p_map_id::smallint, p_best_wave)
    on conflict (user_id, map_id) do update
        set best_wave = greatest(public.endless_scores.best_wave, excluded.best_wave),
            updated_at = now();
end;
$$;

revoke all on function public.submit_endless_score(integer, integer) from public, anon;
grant execute on function public.submit_endless_score(integer, integer) to authenticated;

create or replace function public.award_campaign_clear(p_level_id integer, p_run_id uuid)
returns table (coins_awarded integer, total_coins integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_awarded integer := 0;
    v_total integer;
    v_reward constant integer := 100;
begin
    if v_user_id is null then
        raise exception 'Sign in before saving campaign progress.';
    end if;
    if p_level_id not between 1 and 6 or p_run_id is null then
        raise exception 'Invalid campaign completion.';
    end if;

    insert into public.campaign_reward_events as inserted_event (user_id, run_id, level_id, coins_awarded)
    values (v_user_id, p_run_id, p_level_id::smallint, v_reward)
    on conflict (user_id, run_id) do nothing
    returning inserted_event.coins_awarded into v_awarded;

    if v_awarded is not null then
        update public.player_progress as progress
        set coins = progress.coins + v_awarded,
            completed_campaign_levels = array(
                select distinct completed_level
                from unnest(progress.completed_campaign_levels || p_level_id::smallint) as levels(completed_level)
                order by completed_level
            ),
            updated_at = now()
        where progress.user_id = v_user_id;
    else
        v_awarded := 0;
        update public.player_progress as progress
        set completed_campaign_levels = array(
                select distinct completed_level
                from unnest(progress.completed_campaign_levels || p_level_id::smallint) as levels(completed_level)
                order by completed_level
            ),
            updated_at = now()
        where progress.user_id = v_user_id;
    end if;

    select progress.coins into v_total
    from public.player_progress as progress
    where progress.user_id = v_user_id;

    return query select v_awarded, v_total;
end;
$$;

revoke all on function public.award_campaign_clear(integer, uuid) from public, anon;
grant execute on function public.award_campaign_clear(integer, uuid) to authenticated;

-- One-time import of progress that was saved in localStorage before accounts
-- were connected. This cannot be used to overwrite an existing cloud save.
create or replace function public.import_legacy_progress(
    p_coins integer,
    p_unlocked_survivors text[],
    p_completed_campaign_levels smallint[],
    p_endless_scores jsonb,
    p_callsign text,
    p_portrait_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_imported boolean := false;
begin
    if v_user_id is null then
        raise exception 'Sign in before importing local progress.';
    end if;

    update public.player_progress as progress
    set coins = greatest(0, least(coalesce(p_coins, 0), 2147483647)),
        unlocked_survivors = coalesce((
            select array_agg(distinct survivor_id order by survivor_id)
            from unnest(coalesce(p_unlocked_survivors, '{}'::text[])) as survivors(survivor_id)
            where survivors.survivor_id in ('mason', 'james', 'cody', 'britney', 'zach', 'brady')
        ), '{}'::text[]),
        completed_campaign_levels = coalesce((
            select array_agg(distinct level_id order by level_id)
            from unnest(coalesce(p_completed_campaign_levels, '{}'::smallint[])) as levels(level_id)
            where levels.level_id between 1 and 6
        ), '{}'::smallint[]),
        legacy_imported_at = now(),
        updated_at = now()
    where progress.user_id = v_user_id
      and progress.legacy_imported_at is null;

    v_imported := found;
    if not v_imported then
        return false;
    end if;

    update public.player_profiles as profile
    set callsign = left(coalesce(nullif(trim(p_callsign), ''), profile.callsign), 18),
        portrait_id = case
            when p_portrait_id in ('mason', 'james', 'cody', 'britney', 'zach', 'brady') then p_portrait_id
            else profile.portrait_id
        end,
        updated_at = now()
    where profile.id = v_user_id;

    insert into public.endless_scores (user_id, map_id, best_wave)
    select v_user_id, score.key::smallint,
        case
            when score.value ~ '^[0-9]+$' then
                case when score.value::numeric <= 2147483647 then score.value::integer else 0 end
            else 0
        end
    from jsonb_each_text(coalesce(p_endless_scores, '{}'::jsonb)) as score(key, value)
    where score.key ~ '^[1-6]$'
      and case
            when score.value ~ '^[0-9]+$' then
                case when score.value::numeric > 0 and score.value::numeric <= 2147483647 then true else false end
            else false
          end
    on conflict (user_id, map_id) do update
        set best_wave = greatest(public.endless_scores.best_wave, excluded.best_wave),
            updated_at = now();

    return true;
end;
$$;

revoke all on function public.import_legacy_progress(integer, text[], smallint[], jsonb, text, text) from public, anon;
grant execute on function public.import_legacy_progress(integer, text[], smallint[], jsonb, text, text) to authenticated;
