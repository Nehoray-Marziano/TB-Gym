-- 1. GYM SESSIONS TABLE
create table gym_sessions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  max_capacity int not null default 10,
  created_at timestamptz default now()
);

-- Enable RLS
alter table gym_sessions enable row level security;

-- Policy: Everyone can view sessions
create policy "Public sessions view" 
on gym_sessions for select 
using (true);

-- Policy: Only Admins can insert/update/delete 
-- (Assuming 'administrator' role in profiles, OR just service_role for now. 
-- We will add a policy based on the 'role' column in profiles later if needed.
-- For now, we rely on Supabase Dashboard logic or service_role key for admin actions).


-- 2. USER CREDITS TABLE (Abstract Payments)
create table user_credits (
  user_id uuid references profiles(id) primary key,
  balance int not null default 0,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table user_credits enable row level security;

-- Policy: Users can view their own balance
create policy "View own credits" 
on user_credits for select 
using (auth.uid() = user_id);

-- Policy: Only Admins can update balance (or via specific RPC functions)


-- 3. BOOKINGS TABLE
create table bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  session_id uuid references gym_sessions(id) ON DELETE CASCADE not null,
  status text check (status in ('confirmed', 'cancelled', 'waitlist')) default 'confirmed',
  created_at timestamptz default now(),
  unique(user_id, session_id) -- Prevent double booking
);

-- Enable RLS
alter table bookings enable row level security;

-- Policy: Users can view their own bookings
create policy "View own bookings" 
on bookings for select 
using (auth.uid() = user_id);

-- Policy: Users can create bookings (But we prefer RPC for safety)
create policy "Create own booking" 
on bookings for insert 
with check (auth.uid() = user_id);


-- 4. FUNCTION: BOOK SESSION (Transactional)
-- handles capacity check + credit deduction
create or replace function book_session(session_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  current_balance int;
  session_capacity int;
  current_bookings int;
begin
  -- 1. Get User Balance
  select balance into current_balance from user_credits where user_id = auth.uid();
  
  if current_balance is null or current_balance < 1 then
    return json_build_object('success', false, 'message', 'Insufficient credits');
  end if;

  -- 2. Check Session Capacity
  select max_capacity into session_capacity from gym_sessions where id = session_id;
  select count(*) into current_bookings from bookings where bookings.session_id = book_session.session_id and status = 'confirmed';

  if current_bookings >= session_capacity then
    return json_build_object('success', false, 'message', 'Session is full');
  end if;

  -- 3. Perform Booking
  -- Deduct Credit
  update user_credits set balance = balance - 1 where user_id = auth.uid();
  
  -- Insert Booking
  insert into bookings (user_id, session_id) values (auth.uid(), session_id);

  return json_build_object('success', true, 'message', 'Booked successfully');

exception 
  when unique_violation then
    return json_build_object('success', false, 'message', 'Already booked');
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end;
$$;


-- 5. TRIGGER: Initialize credits for new users (Optional, giving 0 by default)
-- The credits table row needs to exist for the update to work.
create or replace function handle_new_user_credits()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 0); -- Start with 0 credits
  return new;
end;
$$;

-- Hook into the existing user key or profile creation? 
-- Let's hook it after profile creation to be safe, or just insert it when a profile is created.
-- Ideally we add this to the `handle_new_user` logic we set up in Phase 2.
-- For now, we can run a backfill for existing users:
insert into user_credits (user_id, balance)
select id, 0 from profiles
where id not in (select user_id from user_credits);

