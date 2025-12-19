-- Allow Admins to INSERT sessions
create policy "Admins can insert sessions"
on gym_sessions for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);

-- Allow Admins to UPDATE sessions
create policy "Admins can update sessions"
on gym_sessions for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);

-- Allow Admins to DELETE sessions
create policy "Admins can delete sessions"
on gym_sessions for delete
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'administrator'
  )
);
