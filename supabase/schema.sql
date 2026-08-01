-- ============================================================
-- Trip Management System — Auth & Profile schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

-- 1. Enums -----------------------------------------------------
create type user_role as enum
('student', 'admin');
create type verification_status as enum
('pending', 'verified', 'rejected');
create type gender_option as enum
('male', 'female', 'other');

-- 1b. Minimal trips stub ----------------------------------------
-- You'll flesh this out later (dates, price, status, etc). It only
-- needs to exist now so profiles.current_trip_id has something to
-- reference. Safe to `alter table` later without touching profiles.
create table public.trips
(
  id uuid primary key default gen_random_uuid(),
  trip_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "trips: everyone signed-in can read"
  on public.trips for
select
  using (auth.role() = 'authenticated');

-- 2. Profiles table --------------------------------------------
-- One row per auth.users row. Created automatically on sign-up
-- via the trigger below.
create table public.profiles
(
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',

  -- personal info
  -- NOTE: only full_name is populated at the moment of insert (the
  -- signup trigger passes it through from auth metadata). Everything
  -- else below is filled a moment later by an `update`, once the auth
  -- user exists — so it's nullable at the DB level even though the
  -- Zod form on the frontend requires all of it before submit.
  full_name text not null,
  age smallint check (age between 16 and 100),
  phone_calling text,
  phone_whatsapp text,
  gender gender_option,
  gender_other text,

  -- guardian / emergency contact
  guardian_name text,
  guardian_contact text,
  guardian_relation text,

  -- college / authority details (kept as one free-text field on purpose —
  -- some registrants aren't students, e.g. "works under X organization")
  college_name text,
  department text,
  year_of_study text,

  -- identity document
  aadhar_number text check (aadhar_number is null or aadhar_number
  ~ '^\d{12}$'),
  aadhar_photo_path text,

  -- becomes true once every field above has actually been filled in —
  -- lets the admin (and the student's own dashboard) tell "signed up"
  -- apart from "actually finished registering"
  registration_complete boolean not null default false,

  -- admin verifies the student's identity docs independently of payments
  id_verification_status verification_status not null default 'pending',
  id_verification_note    text,

  -- which trip "batch" the student currently belongs to (nullable)
  current_trip_id     uuid references public.trips
  (id) on
  delete
  set null
  ,

  created_at          timestamptz not null default now
  (),
  updated_at          timestamptz not null default now
  ()
);

  alter table public.profiles enable row level security;

  -- A student can read/update only their own profile.
  create policy "profiles: self read"
  on public.profiles for
  select
    using (auth.uid() = id);

  create policy "profiles: self update"
  on public.profiles for
  update
  using (auth.uid()
  = id)
  with check
  (
    -- students cannot promote themselves to admin or change their own
    -- verification status
    role =
  (select role
  from public.profiles
  where id = auth.uid())
  and id_verification_status =
  (select id_verification_status
  from public.profiles
  where id = auth.uid())
  );

  create policy "profiles: self insert"
  on public.profiles for
  insert
  with check (auth.uid() =
  id);

  -- Admins can read and update everyone.
  create policy "profiles: admin read all"
  on public.profiles for
  select
    using (
    exists (select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin')
  );

  create policy "profiles: admin update all"
  on public.profiles for
  update
  using (
    exists (select 1
  from public.profiles p
  where p.id = auth.uid() and p.role = 'admin')
  );

  -- keep updated_at fresh
  create or replace function public.set_updated_at
  ()
returns trigger language plpgsql as $$
  begin
  new.updated_at = now
  ();
  return new;
  end;
$$;

  create trigger profiles_set_updated_at
  before
  update on public.profiles
  for each row
  execute
  function public.set_updated_at
  ();

  -- 3. Auto-create a profile row whenever someone signs up --------
  create or replace function public.handle_new_user
  ()
returns trigger language plpgsql security definer as $$
  begin
    insert into public.profiles
      (id, full_name, role)
    values
      (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        'student'
  );
    return new;
  end;
  $$;

  create trigger on_auth_user_created
after
  insert on
  auth.users
  for each row
  execute
  function public.handle_new_user
  ();

  -- 4. Storage bucket -----------------------------------------------
  insert into storage.buckets
    (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('aadhar-photos', 'aadhar-photos', false, 10485760, array
  ['image/jpeg', 'image/png', 'application/pdf'])
on conflict
  (id) do nothing;

  -- Students can upload/read only their own file, named `${user_id}/...`
  create policy "aadhar-photos: owner rw"
  on storage.objects for all
  using
  (bucket_id = 'aadhar-photos' and
  (storage.foldername
  (name))[1] = auth.uid
  ()::text)
  with check
  (bucket_id = 'aadhar-photos' and
  (storage.foldername
  (name))[1] = auth.uid
  ()::text);

  -- Admins can read every file in the bucket
  create policy "aadhar-photos: admin read"
  on storage.objects for
  select
    using (
    bucket_id = 'aadhar-photos'
      and exists (select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin')
  );

-- NOTE: `trips` table is referenced above (current_trip_id). Create a
-- minimal stub now so this file runs standalone; you'll likely replace
-- this with the fuller trips/rooms/payments schema later.
-- Run this BEFORE the profiles table if executing top-to-bottom, or
-- just create trips first — order matters because of the FK.