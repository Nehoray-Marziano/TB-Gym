-- Allow Admins to INSERT new credit rows (needed for upsert when row doesn't exist)
create policy "Admins can insert credits"
on user_credits for insert
with check ( is_admin() );

-- Just in case, grant all to admins for simplicity on this table
-- (Update/Select are already covered, but Delete might be useful later)
create policy "Admins can delete credits"
on user_credits for delete
using ( is_admin() );
