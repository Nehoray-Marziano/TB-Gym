-- 1. Packages (Products)
create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  credits integer not null, -- How many credits this gives
  created_at timestamptz default now()
);

-- 2. Purchase Requests (Manual Payment Flow)
create type request_status as enum ('pending', 'approved', 'rejected');

create table if not exists purchase_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  package_id uuid references packages(id) on delete set null not null,
  status request_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. RLS Policies

-- Packages: Everyone can read, Admins can manage
alter table packages enable row level security;

create policy "Public can view packages"
on packages for select
using (true);

create policy "Admins can manage packages"
on packages for all
using ( is_admin() );

-- Purchase Requests: Users can see own, Admins can see all
alter table purchase_requests enable row level security;

create policy "Users can view own requests"
on purchase_requests for select
using ( auth.uid() = user_id );

create policy "Users can create requests"
on purchase_requests for insert
with check ( auth.uid() = user_id );

create policy "Admins can manage requests"
on purchase_requests for all
using ( is_admin() );

-- 4. Initial Seed Data
insert into packages (name, description, price, credits) values
('Drop-in Class', 'Single session pass', 80, 1),
('10 Class Pass', 'Discounted bundle of 10 classes', 700, 10),
('Monthly Unlimited', 'Access to all classes for 30 days', 500, 999);
