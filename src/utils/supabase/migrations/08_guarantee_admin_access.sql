-- 1. Ensure the is_admin function exists and is secure
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from profiles
    where id = auth.uid()
    and role = 'administrator'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop potentially conflicting policies
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can view own profile" on profiles;

-- 3. Create a comprehensive policy for profiles
-- Allow admins to see EVERYTHING
create policy "Admins can view all profiles"
on profiles for select
using ( is_admin() );

-- Allow users to see their own profile (and maybe other public info if needed, but keeping it strict for now)
create policy "Users can view own profile"
on profiles for select
using ( auth.uid() = id );

-- 4. User Credits Policies
drop policy if exists "Admins can view all credits" on user_credits;
create policy "Admins can view all credits"
on user_credits for select
using ( is_admin() );

drop policy if exists "Admins can update all credits" on user_credits;
create policy "Admins can update all credits"
on user_credits for update
using ( is_admin() );

-- 5. Force update the current user to administrator (Run this if you know your own Email)
-- update profiles set role = 'administrator' where email = 'YOUR_EMAIL@gmail.com';
