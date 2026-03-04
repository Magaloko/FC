-- ============================================================================
-- Football Club Management Platform - Complete Database Schema
-- Platform: Supabase (PostgreSQL)
-- ============================================================================
-- This schema defines all tables, enums, indexes, RLS policies, and triggers
-- for managing football clubs, teams, players, trainings, matches, and more.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- Enable the moddatetime extension for automatic updated_at handling (optional
-- alternative to the custom trigger below). We rely on a custom trigger instead
-- to keep things explicit, but the extension is available if needed.
-- ============================================================================

create extension if not exists "moddatetime" schema "extensions";


-- ============================================================================
-- 2. CUSTOM ENUM TYPES
-- ============================================================================
-- Define all enum types used across the schema before creating tables.
-- ============================================================================

-- Role assigned to each user within the platform
create type public.user_role as enum (
  'admin',
  'club_manager',
  'coach',
  'assistant_coach',
  'player',
  'parent'
);

-- Preferred foot of a player
create type public.preferred_foot as enum (
  'left',
  'right',
  'both'
);

-- Attendance status for training sessions
create type public.attendance_status as enum (
  'present',
  'late',
  'injured',
  'absent'
);

-- Whether the team plays at home or away
create type public.home_away as enum (
  'home',
  'away'
);

-- Type of event that occurs during a match
create type public.match_event_type as enum (
  'goal',
  'assist',
  'card',
  'substitution'
);

-- Context in which a player rating was given
create type public.rating_context as enum (
  'training',
  'match'
);

-- Type of calendar event
create type public.calendar_event_type as enum (
  'training',
  'match',
  'event'
);

-- Type of announcement
create type public.announcement_type as enum (
  'general',
  'training_reminder',
  'match_reminder',
  'parent_message'
);


-- ============================================================================
-- 3. TRIGGER FUNCTION: handle_updated_at
-- ============================================================================
-- This function has no table dependency (only references new.updated_at),
-- so it can safely be created before any tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger function: automatically set updated_at to now() on row update
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4a. clubs
-- ----------------------------------------------------------------------------
-- Top-level entity. Every other record is scoped to a club.
-- ----------------------------------------------------------------------------
create table public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  address    text,
  city       text,
  country    text,
  founded_year integer,
  website    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clubs is 'Football clubs registered on the platform.';

-- ----------------------------------------------------------------------------
-- 4b. profiles
-- ----------------------------------------------------------------------------
-- Extends Supabase auth.users with application-specific fields.
-- The id column references auth.users so every profile maps 1-to-1 to a user.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  club_id    uuid references public.clubs(id) on delete set null,
  full_name  text not null default '',
  email      text not null default '',
  role       public.user_role not null default 'player',
  avatar_url text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending auth.users with club membership and role.';

-- ----------------------------------------------------------------------------
-- 4c. teams
-- ----------------------------------------------------------------------------
-- A club can have many teams (e.g. U8, U10, First Team).
-- Each team optionally references a head coach and assistant coach.
-- ----------------------------------------------------------------------------
create table public.teams (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references public.clubs(id) on delete cascade,
  name               text not null,
  category           text,  -- e.g. "U8", "U10", "U14", "First Team"
  season             text,  -- e.g. "2025-2026"
  coach_id           uuid references public.profiles(id) on delete set null,
  assistant_coach_id uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.teams is 'Teams within a club, categorised by age group or level.';

-- ----------------------------------------------------------------------------
-- 4d. players
-- ----------------------------------------------------------------------------
-- Represents a player registered to a team. The user_id is nullable because
-- young players may not have their own platform account (a parent might
-- manage them instead).
-- ----------------------------------------------------------------------------
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete set null,
  name           text not null,
  date_of_birth  date,
  position       text,
  preferred_foot public.preferred_foot,
  height         numeric(5, 2),  -- in cm
  weight         numeric(5, 2),  -- in kg
  jersey_number  integer,
  contact_email  text,
  contact_phone  text,
  parent_name    text,
  parent_email   text,
  parent_phone   text,
  photo_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.players is 'Players registered to a team. May or may not have a platform account.';

-- ----------------------------------------------------------------------------
-- 4e. player_stats
-- ----------------------------------------------------------------------------
-- Aggregated / current skill ratings for a player on a 1-100 scale.
-- One row per player (latest snapshot).
-- ----------------------------------------------------------------------------
create table public.player_stats (
  id                      uuid primary key default gen_random_uuid(),
  player_id               uuid not null references public.players(id) on delete cascade,
  speed                   integer check (speed between 1 and 100),
  stamina                 integer check (stamina between 1 and 100),
  technique               integer check (technique between 1 and 100),
  passing                 integer check (passing between 1 and 100),
  shooting                integer check (shooting between 1 and 100),
  dribbling               integer check (dribbling between 1 and 100),
  defense                 integer check (defense between 1 and 100),
  tactical_understanding  integer check (tactical_understanding between 1 and 100),
  updated_at              timestamptz not null default now(),

  constraint player_stats_player_unique unique (player_id)
);

comment on table public.player_stats is 'Current skill ratings (1-100) for each player.';

-- ----------------------------------------------------------------------------
-- 4f. trainings
-- ----------------------------------------------------------------------------
-- Training sessions scheduled for a team.
-- ----------------------------------------------------------------------------
create table public.trainings (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time,
  location   text,
  focus      text,       -- e.g. "Passing drills", "Set pieces"
  notes      text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trainings is 'Scheduled training sessions for a team.';

-- ----------------------------------------------------------------------------
-- 4g. training_attendance
-- ----------------------------------------------------------------------------
-- Tracks which players attended each training and their status.
-- ----------------------------------------------------------------------------
create table public.training_attendance (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  status      public.attendance_status not null default 'present',
  notes       text,
  created_at  timestamptz not null default now(),

  constraint training_attendance_unique unique (training_id, player_id)
);

comment on table public.training_attendance is 'Attendance records for each training session.';

-- ----------------------------------------------------------------------------
-- 4h. matches
-- ----------------------------------------------------------------------------
-- Match fixtures and results for a team.
-- ----------------------------------------------------------------------------
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  opponent      text not null,
  competition   text,
  date          date not null,
  time          time,
  location      text,
  home_or_away  public.home_away not null default 'home',
  score_home    integer,
  score_away    integer,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.matches is 'Match fixtures and results.';

-- ----------------------------------------------------------------------------
-- 4i. match_events
-- ----------------------------------------------------------------------------
-- Notable events that happen during a match (goals, assists, cards, subs).
-- ----------------------------------------------------------------------------
create table public.match_events (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  event_type public.match_event_type not null,
  minute     integer,
  details    text,
  created_at timestamptz not null default now()
);

comment on table public.match_events is 'Events occurring during a match (goals, cards, etc.).';

-- ----------------------------------------------------------------------------
-- 4j. player_ratings
-- ----------------------------------------------------------------------------
-- Individual performance ratings given by coaches after a training or match.
-- Uses a 1-10 scale per attribute.
-- context_id is a generic UUID pointing to either a training or match record.
-- ----------------------------------------------------------------------------
create table public.player_ratings (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  rated_by            uuid not null references public.profiles(id) on delete cascade,
  context_type        public.rating_context not null,
  context_id          uuid,  -- references either trainings.id or matches.id
  speed               integer check (speed between 1 and 10),
  technique           integer check (technique between 1 and 10),
  passing             integer check (passing between 1 and 10),
  shooting            integer check (shooting between 1 and 10),
  defense             integer check (defense between 1 and 10),
  tactical_awareness  integer check (tactical_awareness between 1 and 10),
  overall_notes       text,
  created_at          timestamptz not null default now()
);

comment on table public.player_ratings is 'Per-session player ratings (1-10) given by coaches.';

-- ----------------------------------------------------------------------------
-- 4k. calendar_events
-- ----------------------------------------------------------------------------
-- General calendar entries visible to club or team members.
-- ----------------------------------------------------------------------------
create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  title       text not null,
  description text,
  event_type  public.calendar_event_type not null default 'event',
  date        date not null,
  start_time  time,
  end_time    time,
  location    text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.calendar_events is 'Calendar entries for clubs and teams.';

-- ----------------------------------------------------------------------------
-- 4l. announcements
-- ----------------------------------------------------------------------------
-- Messages / notices published to a club or specific team.
-- ----------------------------------------------------------------------------
create table public.announcements (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references public.clubs(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete cascade,
  author_id         uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  content           text,
  announcement_type public.announcement_type not null default 'general',
  is_pinned         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.announcements is 'Announcements and notices for clubs or teams.';

-- ----------------------------------------------------------------------------
-- 4m. team_memberships
-- ----------------------------------------------------------------------------
-- Links users to teams with a specific role. This allows a single user to
-- belong to multiple teams (e.g. a coach managing two age groups, or a parent
-- linked to two children's teams).
-- ----------------------------------------------------------------------------
create table public.team_memberships (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.user_role not null default 'player',
  created_at timestamptz not null default now(),

  constraint team_memberships_unique unique (team_id, user_id)
);

comment on table public.team_memberships is 'Associates users with teams and their role within each team.';


-- ============================================================================
-- 5. FUNCTIONS THAT DEPEND ON TABLES
-- ============================================================================
-- These functions reference the profiles table (and others), so they must be
-- created AFTER all tables exist.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5a. Trigger function: create a profile row when a new user signs up
-- ----------------------------------------------------------------------------
-- When a user is inserted into auth.users (via Supabase Auth), this trigger
-- automatically creates a corresponding row in public.profiles so that the
-- application always has a profile to reference.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5b. Helper: get the club_id for the currently authenticated user
-- ----------------------------------------------------------------------------
create or replace function public.get_my_club_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select club_id
  from public.profiles
  where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 5c. Helper: get the role for the currently authenticated user
-- ----------------------------------------------------------------------------
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 5d. Helper: check if current user has a staff-level role (coach or above)
-- ----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'club_manager', 'coach', 'assistant_coach')
  );
$$;

-- ----------------------------------------------------------------------------
-- 5e. Helper: check if current user is admin or club_manager
-- ----------------------------------------------------------------------------
create or replace function public.is_club_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'club_manager')
  );
$$;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-create a profile when a new user signs up via Supabase Auth
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Auto-update updated_at on every table that has the column
create trigger set_updated_at before update on public.clubs
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.teams
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.players
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.player_stats
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.trainings
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.matches
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.announcements
  for each row execute function public.handle_updated_at();


-- ============================================================================
-- 7. INDEXES
-- ============================================================================
-- Indexes on foreign keys and commonly filtered / sorted columns to improve
-- query performance.
-- ============================================================================

-- profiles
create index idx_profiles_club_id on public.profiles(club_id);
create index idx_profiles_role    on public.profiles(role);

-- teams
create index idx_teams_club_id  on public.teams(club_id);
create index idx_teams_coach_id on public.teams(coach_id);
create index idx_teams_category on public.teams(category);

-- players
create index idx_players_team_id on public.players(team_id);
create index idx_players_user_id on public.players(user_id);

-- player_stats
create index idx_player_stats_player_id on public.player_stats(player_id);

-- trainings
create index idx_trainings_team_id on public.trainings(team_id);
create index idx_trainings_date    on public.trainings(date);

-- training_attendance
create index idx_training_attendance_training_id on public.training_attendance(training_id);
create index idx_training_attendance_player_id   on public.training_attendance(player_id);

-- matches
create index idx_matches_team_id on public.matches(team_id);
create index idx_matches_date    on public.matches(date);

-- match_events
create index idx_match_events_match_id  on public.match_events(match_id);
create index idx_match_events_player_id on public.match_events(player_id);

-- player_ratings
create index idx_player_ratings_player_id    on public.player_ratings(player_id);
create index idx_player_ratings_rated_by     on public.player_ratings(rated_by);
create index idx_player_ratings_context      on public.player_ratings(context_type, context_id);

-- calendar_events
create index idx_calendar_events_club_id on public.calendar_events(club_id);
create index idx_calendar_events_team_id on public.calendar_events(team_id);
create index idx_calendar_events_date    on public.calendar_events(date);

-- announcements
create index idx_announcements_club_id   on public.announcements(club_id);
create index idx_announcements_team_id   on public.announcements(team_id);
create index idx_announcements_author_id on public.announcements(author_id);

-- team_memberships
create index idx_team_memberships_team_id on public.team_memberships(team_id);
create index idx_team_memberships_user_id on public.team_memberships(user_id);


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on every table and define policies. The general strategy:
--
--   SELECT : any authenticated user can read data within their own club.
--   INSERT : staff (coach, assistant_coach, club_manager, admin) can create
--            operational records (trainings, matches, ratings, etc.).
--            Admins/club_managers can create any record in their club.
--   UPDATE : same as INSERT, scoped to own club.
--   DELETE : only admins and club_managers can delete, scoped to own club.
--
-- "Staff" = admin, club_manager, coach, assistant_coach
-- "Club admin" = admin, club_manager
-- ============================================================================

-- -------------------------------------------------------
-- 8a. clubs
-- -------------------------------------------------------
alter table public.clubs enable row level security;

-- Any authenticated user can view their own club
create policy "Users can view their own club"
  on public.clubs for select
  to authenticated
  using (id = public.get_my_club_id());

-- Admins / club_managers can update their own club
create policy "Club admins can update their club"
  on public.clubs for update
  to authenticated
  using (id = public.get_my_club_id() and public.is_club_admin())
  with check (id = public.get_my_club_id() and public.is_club_admin());

-- Only platform-level admins can insert new clubs (or use service_role)
create policy "Admins can insert clubs"
  on public.clubs for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

-- -------------------------------------------------------
-- 8b. profiles
-- -------------------------------------------------------
alter table public.profiles enable row level security;

-- Users can view all profiles within their club
create policy "Users can view profiles in their club"
  on public.profiles for select
  to authenticated
  using (
    club_id = public.get_my_club_id()
    or id = auth.uid()  -- always allow reading own profile
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Club admins can update any profile in their club (e.g. assign roles)
create policy "Club admins can update profiles in their club"
  on public.profiles for update
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_club_admin())
  with check (club_id = public.get_my_club_id() and public.is_club_admin());

-- Profile insertion is handled by the trigger; allow the function to insert
create policy "Service can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- -------------------------------------------------------
-- 8c. teams
-- -------------------------------------------------------
alter table public.teams enable row level security;

-- Users can view teams in their club
create policy "Users can view teams in their club"
  on public.teams for select
  to authenticated
  using (club_id = public.get_my_club_id());

-- Club admins can create teams
create policy "Club admins can insert teams"
  on public.teams for insert
  to authenticated
  with check (club_id = public.get_my_club_id() and public.is_club_admin());

-- Club admins can update teams
create policy "Club admins can update teams"
  on public.teams for update
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_club_admin())
  with check (club_id = public.get_my_club_id() and public.is_club_admin());

-- Club admins can delete teams
create policy "Club admins can delete teams"
  on public.teams for delete
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_club_admin());

-- -------------------------------------------------------
-- 8d. players
-- -------------------------------------------------------
alter table public.players enable row level security;

-- Users can view players in teams belonging to their club
create policy "Users can view players in their club"
  on public.players for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert players into their club's teams
create policy "Staff can insert players"
  on public.players for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update players in their club
create policy "Staff can update players"
  on public.players for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can delete players
create policy "Club admins can delete players"
  on public.players for delete
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8e. player_stats
-- -------------------------------------------------------
alter table public.player_stats enable row level security;

-- Users can view stats for players in their club
create policy "Users can view player stats in their club"
  on public.player_stats for select
  to authenticated
  using (
    exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert/update stats
create policy "Staff can insert player stats"
  on public.player_stats for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  );

create policy "Staff can update player stats"
  on public.player_stats for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8f. trainings
-- -------------------------------------------------------
alter table public.trainings enable row level security;

-- Users can view trainings for their club's teams
create policy "Users can view trainings in their club"
  on public.trainings for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can create trainings
create policy "Staff can insert trainings"
  on public.trainings for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update trainings
create policy "Staff can update trainings"
  on public.trainings for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can delete trainings
create policy "Club admins can delete trainings"
  on public.trainings for delete
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8g. training_attendance
-- -------------------------------------------------------
alter table public.training_attendance enable row level security;

-- Users can view attendance for their club
create policy "Users can view training attendance in their club"
  on public.training_attendance for select
  to authenticated
  using (
    exists (
      select 1 from public.trainings tr
      join public.teams t on t.id = tr.team_id
      where tr.id = training_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert attendance records
create policy "Staff can insert training attendance"
  on public.training_attendance for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.trainings tr
      join public.teams t on t.id = tr.team_id
      where tr.id = training_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update attendance records
create policy "Staff can update training attendance"
  on public.training_attendance for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.trainings tr
      join public.teams t on t.id = tr.team_id
      where tr.id = training_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.trainings tr
      join public.teams t on t.id = tr.team_id
      where tr.id = training_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8h. matches
-- -------------------------------------------------------
alter table public.matches enable row level security;

-- Users can view matches in their club
create policy "Users can view matches in their club"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert matches
create policy "Staff can insert matches"
  on public.matches for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update matches
create policy "Staff can update matches"
  on public.matches for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can delete matches
create policy "Club admins can delete matches"
  on public.matches for delete
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8i. match_events
-- -------------------------------------------------------
alter table public.match_events enable row level security;

-- Users can view match events in their club
create policy "Users can view match events in their club"
  on public.match_events for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      join public.teams t on t.id = m.team_id
      where m.id = match_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert match events
create policy "Staff can insert match events"
  on public.match_events for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.matches m
      join public.teams t on t.id = m.team_id
      where m.id = match_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update match events
create policy "Staff can update match events"
  on public.match_events for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.matches m
      join public.teams t on t.id = m.team_id
      where m.id = match_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.matches m
      join public.teams t on t.id = m.team_id
      where m.id = match_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can delete match events
create policy "Club admins can delete match events"
  on public.match_events for delete
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.matches m
      join public.teams t on t.id = m.team_id
      where m.id = match_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- -------------------------------------------------------
-- 8j. player_ratings
-- -------------------------------------------------------
alter table public.player_ratings enable row level security;

-- Users can view ratings for players in their club
create policy "Users can view player ratings in their club"
  on public.player_ratings for select
  to authenticated
  using (
    exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can insert ratings
create policy "Staff can insert player ratings"
  on public.player_ratings for insert
  to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.players p
      join public.teams t on t.id = p.team_id
      where p.id = player_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Staff can update their own ratings
create policy "Staff can update own player ratings"
  on public.player_ratings for update
  to authenticated
  using (
    rated_by = auth.uid()
    and public.is_staff()
  )
  with check (
    rated_by = auth.uid()
    and public.is_staff()
  );

-- -------------------------------------------------------
-- 8k. calendar_events
-- -------------------------------------------------------
alter table public.calendar_events enable row level security;

-- Users can view calendar events in their club
create policy "Users can view calendar events in their club"
  on public.calendar_events for select
  to authenticated
  using (club_id = public.get_my_club_id());

-- Staff can insert calendar events
create policy "Staff can insert calendar events"
  on public.calendar_events for insert
  to authenticated
  with check (
    club_id = public.get_my_club_id()
    and public.is_staff()
  );

-- Staff can update calendar events in their club
create policy "Staff can update calendar events"
  on public.calendar_events for update
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_staff())
  with check (club_id = public.get_my_club_id() and public.is_staff());

-- Club admins can delete calendar events
create policy "Club admins can delete calendar events"
  on public.calendar_events for delete
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_club_admin());

-- -------------------------------------------------------
-- 8l. announcements
-- -------------------------------------------------------
alter table public.announcements enable row level security;

-- Users can view announcements in their club
create policy "Users can view announcements in their club"
  on public.announcements for select
  to authenticated
  using (club_id = public.get_my_club_id());

-- Staff can insert announcements
create policy "Staff can insert announcements"
  on public.announcements for insert
  to authenticated
  with check (
    club_id = public.get_my_club_id()
    and public.is_staff()
  );

-- Staff can update announcements in their club
create policy "Staff can update announcements"
  on public.announcements for update
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_staff())
  with check (club_id = public.get_my_club_id() and public.is_staff());

-- Club admins can delete announcements
create policy "Club admins can delete announcements"
  on public.announcements for delete
  to authenticated
  using (club_id = public.get_my_club_id() and public.is_club_admin());

-- -------------------------------------------------------
-- 8m. team_memberships
-- -------------------------------------------------------
alter table public.team_memberships enable row level security;

-- Users can view memberships in their club's teams
create policy "Users can view team memberships in their club"
  on public.team_memberships for select
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can insert team memberships
create policy "Club admins can insert team memberships"
  on public.team_memberships for insert
  to authenticated
  with check (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can update team memberships
create policy "Club admins can update team memberships"
  on public.team_memberships for update
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  )
  with check (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );

-- Club admins can delete team memberships
create policy "Club admins can delete team memberships"
  on public.team_memberships for delete
  to authenticated
  using (
    public.is_club_admin()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.club_id = public.get_my_club_id()
    )
  );


-- ============================================================================
-- 9. STORAGE BUCKETS (optional, configure via Supabase dashboard)
-- ============================================================================
-- You may want to create storage buckets for:
--   - club-logos     : Club logo images
--   - player-photos  : Player profile pictures
--   - avatars        : User avatar images
--
-- Example (run via SQL or configure in the dashboard):
--
--   insert into storage.buckets (id, name, public)
--   values
--     ('club-logos',    'club-logos',    true),
--     ('player-photos', 'player-photos', false),
--     ('avatars',       'avatars',       true);
--
-- Then set up storage policies to control access.
-- ============================================================================


-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- To run this file:
--   1. Open the Supabase SQL Editor for your project.
--   2. Paste the entire contents of this file.
--   3. Click "Run" to execute.
--
-- After running, verify:
--   - All tables appear under the "public" schema in the Table Editor.
--   - RLS is enabled (lock icon) on every table.
--   - The auth trigger is active: sign up a test user and confirm a profile
--     row is created automatically.
-- ============================================================================
