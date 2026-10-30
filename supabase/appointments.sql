-- supabase/appointments.sql
-- Run once in Supabase Dashboard -> SQL Editor.
-- The app saves each booking here. Before, a failed save was silently ignored; now the booking
-- step reports the error, so this table + its policies must exist.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text,
  clinic_name text not null,
  appointment_time timestamptz not null,
  created_at timestamptz default now()
);

alter table public.appointments enable row level security;

-- (auth.uid()::text = user_id::text works whether your existing user_id column is uuid or text)
drop policy if exists "Users insert own appointments" on public.appointments;
create policy "Users insert own appointments" on public.appointments
  for insert with check (auth.uid()::text = user_id::text);

drop policy if exists "Users read own appointments" on public.appointments;
create policy "Users read own appointments" on public.appointments
  for select using (auth.uid()::text = user_id::text);

drop policy if exists "Users delete own appointments" on public.appointments;
create policy "Users delete own appointments" on public.appointments
  for delete using (auth.uid()::text = user_id::text);