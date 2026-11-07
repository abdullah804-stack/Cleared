-- supabase/appointments_fix.sql
-- Tiny, cannot-fail fix for: "Could not find the 'appointment_time' column of 'appointments' in the schema cache".
-- Run in Supabase Dashboard -> SQL Editor (the SAME project your app's EXPO_PUBLIC_SUPABASE_URL points to).

-- 1) Make sure the table and every column the app writes exist.
create table if not exists public.appointments (id uuid primary key default gen_random_uuid());
alter table public.appointments add column if not exists user_id uuid;
alter table public.appointments add column if not exists user_email text;
alter table public.appointments add column if not exists clinic_name text;
alter table public.appointments add column if not exists appointment_time timestamptz;
alter table public.appointments add column if not exists created_at timestamptz default now();

-- 2) Old NOT NULL columns the app never fills would block inserts.
do $$
declare c record;
begin
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and is_nullable = 'NO' and column_default is null
      and column_name <> 'id'
  loop
    execute format('alter table public.appointments alter column %I drop not null', c.column_name);
  end loop;
end $$;

-- 3) Let signed-in users save and read their own bookings.
alter table public.appointments enable row level security;
drop policy if exists "Users insert own appointments" on public.appointments;
create policy "Users insert own appointments" on public.appointments for insert to authenticated with check (auth.uid()::text = user_id::text);
drop policy if exists "Users read own appointments" on public.appointments;
create policy "Users read own appointments" on public.appointments for select to authenticated using (auth.uid()::text = user_id::text);
drop policy if exists "Users delete own appointments" on public.appointments;
create policy "Users delete own appointments" on public.appointments for delete to authenticated using (auth.uid()::text = user_id::text);
grant select, insert, delete on public.appointments to authenticated;

-- 4) Refresh the API cache.
notify pgrst, 'reload schema';

-- 5) PROOF: this must list appointment_time. If it does not, you are in a different project than the app.
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'appointments' order by ordinal_position;