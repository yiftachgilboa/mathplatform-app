create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  access_code char(3) unique not null default lpad(floor(random()*1000)::text, 3, '0')
);

alter table profiles enable row level security;

create policy "profile_self" on profiles
  for all using (auth.uid() = id);

-- יצירת profile אוטומטית בהרשמה
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
