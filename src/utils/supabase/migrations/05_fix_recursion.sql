-- 1. Create a Secure Function to check Admin Status
-- "SECURITY DEFINER" means it runs with the privileges of the creator (postgres/admin), bypassing RLS.
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

-- 2. Drop the recursive/bad policies
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can view all credits" on user_credits;
drop policy if exists "Admins can update all credits" on user_credits;

-- 3. Re-create Safe Policies using the function
-- Profiles
create policy "Admins can view all profiles"
on profiles for select
using ( is_admin() );

-- User Credits
create policy "Admins can view all credits"
on user_credits for select
using ( is_admin() );

create policy "Admins can update all credits"
on user_credits for update
using ( is_admin() );
