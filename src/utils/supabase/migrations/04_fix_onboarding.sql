-- 1. Ensure RLS enabled (idempotent)
alter table profiles enable row level security;

-- 2. Allow users to view their own profile (Critical for Middleware)
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

-- 3. Allow users to update their own profile (For onboarding form)
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

-- 4. EMERGENCY FIX: Mark all existing users as onboarded
-- This breaks the loop for your current user immediately.
update profiles 
set onboarding_completed = true;

-- 5. Ensure you are an admin (Optional, but helpful)
-- update profiles set role = 'administrator'; 
-- (Uncomment above line if you lost admin access)
