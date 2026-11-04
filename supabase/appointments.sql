-- supabase/appointments.sql
-- Run in Supabase Dashboard -> SQL Editor. Safe to run more than once, and safe on an OLD appointments table:
-- it adds any missing columns, relaxes old columns the app doesn't use, and refreshes the API cache.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text,
  clinic_name text not null,
  appointment_time timestamptz not null,
  created_at timestamptz default now()
);

-- If the table already existed from an older version, bring it up to date.
alter table public.appointments add column if not exists id uuid default gen_random_uuid();
alter table public.appointments add column if not exists user_id uuid;
alter table public.appointments add column if not exists user_email text;
alter table public.appointments add column if not exists clinic_name text;
alter table public.appointments add column if not exists appointment_time timestamptz;
alter table public.appointments add column if not exists created_at timestamptz default now();

-- Old columns the app never fills must not block inserts (e.g. an old "appointment_date" NOT NULL column).
do $$
declare c record;
begin
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and is_nullable = 'NO' and column_default is null
      and column_name not in ('id', 'user_id', 'clinic_name', 'appointment_time')
  loop
    execute format('alter table public.appointments alter column %I drop not null', c.column_name);
  end loop;
end $$;

alter table public.appointments enable row level security;

-- (auth.uid()::text = user_id::text works whether user_id is uuid or text)
drop policy if exists "Users insert own appointments" on public.appointments;
create policy "Users insert own appointments" on public.appointments
  for insert with check (auth.uid()::text = user_id::text);

drop policy if exists "Users read own appointments" on public.appointments;
create policy "Users read own appointments" on public.appointments
  for select using (auth.uid()::text = user_id::text);

drop policy if exists "Users delete own appointments" on public.appointments;
create policy "Users delete own appointments" on public.appointments
  for delete using (auth.uid()::text = user_id::text);

-- Make the API notice the new columns right away (this fixes "could not find the column in the schema cache").
notify pgrst, 'reload schema';