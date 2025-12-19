-- 1. Allow Admins to VIEW all user_credits
create policy "Admins can view all credits"
on user_credits for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);

-- 2. Allow Admins to UPDATE user_credits
create policy "Admins can update all credits"
on user_credits for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);

-- 3. Allow Admins to VIEW all profiles (just in case public view isn't fully open)
create policy "Admins can view all profiles"
on profiles for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);
