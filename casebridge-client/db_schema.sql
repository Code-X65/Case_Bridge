-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- Table: external_users
create table if not exists external_users (
  id uuid primary key references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  country text,
  status text check (status in ('registered', 'verified', 'active')) default 'registered',
  created_at timestamp with time zone default now()
);

-- Table: external_user_intent
create table if not exists external_user_intent (
  external_user_id uuid references external_users(id) primary key,
  primary_goals text[],
  persona_type text check (persona_type in ('individual', 'business', 'organisation_rep')),
  urgency_level text check (urgency_level in ('urgent', 'soon', 'researching')),
  referral_source text,
  created_at timestamp with time zone default now()
);

-- RLS Policies
alter table external_users enable row level security;
alter table external_user_intent enable row level security;

-- Users can read/update their own data
create policy "Users can view own profile" on external_users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on external_users
  for update using (auth.uid() = id);

create policy "Users can view own intent" on external_user_intent
  for select using (auth.uid() = external_user_id);

create policy "Users can insert own intent" on external_user_intent
  for insert with check (auth.uid() = external_user_id);

-- Trigger to handle new user creation from Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.external_users (id, first_name, last_name, email, phone, country, status)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    'registered'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
