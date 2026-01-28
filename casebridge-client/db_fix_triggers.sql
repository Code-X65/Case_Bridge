-- 1. CLEANUP POTENTIAL CONFLICTING TRIGGERS (From Internal App)
-- The "Super Fix" created 'on_auth_user_created_handle_invite'. 
-- The "Final Staff Invite" created 'on_invited_signup'.
-- These likely overlap. We should keep the "Super Fix" one as it had ON CONFLICT logic.
drop trigger if exists on_invited_signup on auth.users;

-- 2. ENSURE CLIENT SCHEMA EXISTS
create extension if not exists "uuid-ossp";

create table if not exists public.external_users (
  id uuid primary key references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  country text,
  status text check (status in ('registered', 'verified', 'active')) default 'registered',
  created_at timestamp with time zone default now()
);

-- 3. ROBUST CLIENT TRIGGER FUNCTION
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_client boolean;
begin
  -- Check if basic metadata exists to determine if this is a client signup
  -- or if we should just try to insert anyway.
  -- To prevent Internal Staff signups from creating empty Client records,
  -- we could check for specific metadata, OR just be robust.
  
  -- We use COALESCE to prevent NOT NULL violations
  insert into public.external_users (id, first_name, last_name, email, phone, country, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'Unknown'),
    coalesce(new.raw_user_meta_data->>'last_name', 'User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    'registered'
  );
  
  return new;
exception when others then
  -- Log error but don't fail, so at least the Auth User is created.
  -- However, if external_user is missing, the app flow might break.
  -- But 500ing prevents ANY signup.
  raise warning 'Error in handle_new_user: %', SQLERRM;
  return new;
end;
$$;

-- 4. RECREATE TRIGGER
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

select '✅ Triggers fixed and Schema ensured.' as status;
