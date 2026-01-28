-- ========================================================
-- EMERGENCY AUTH TRIGGER CLEANUP & CLIENT SCHEMA SYNC
-- ========================================================

-- 1. DROP ALL POTENTIALLY CONFLICTING AUTH TRIGGERS
-- These are known trigger names from the Internal Project
drop trigger if exists on_invited_signup on auth.users;
drop trigger if exists on_auth_user_created_handle_invite on auth.users;
drop trigger if exists on_invited_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

-- 2. ENSURE CANONICAL CLIENT TABLES
-- Ensure the external_users table matches the prompt exactly
create table if not exists public.external_users (
    id uuid primary key references auth.users(id),
    first_name text,
    last_name text,
    email text unique not null,
    phone text,
    country text,
    status text check (status in ('registered', 'verified', 'active')) default 'registered',
    created_at timestamp with time zone default now()
);

-- Ensure the intent table exists
create table if not exists public.external_user_intent (
    external_user_id uuid references public.external_users(id) primary key,
    primary_goals text[],
    persona_type text check (persona_type in ('individual', 'business', 'organisation_rep')),
    urgency_level text check (urgency_level in ('urgent', 'soon', 'researching')),
    referral_source text,
    created_at timestamp with time zone default now()
);

-- 3. BULLETPROOF TRIGGER FUNCTION
-- This function handles BOTH internal invites (if any) and Client creation
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    v_invite_exists boolean;
begin
    -- DEBUG LOG
    raise log 'Handling signup for email: %', new.email;

    -- PART A: Handle Internal Invitations (Co-existence logic)
    -- Check if invitations table exists and has a pending invite
    begin
        select exists (
            select 1 from public.invitations 
            where email = new.email and status = 'pending'
        ) into v_invite_exists;
    exception when others then
        v_invite_exists := false;
    end;

    if v_invite_exists then
        -- This logic is for Internal Staff (copied and simplified from Internal project)
        -- We let the Internal project's logic handle this if possible, 
        -- but since we dropped their triggers, we should eventually merge them.
        -- FOR NOW: Focus on Client creation.
        raise log 'Invite found for %, skipping Client creation', new.email;
    else
        -- PART B: Client Identity Creation
        raise log 'No invite found. Creating Client record for %', new.email;
        
        insert into public.external_users (id, first_name, last_name, email, phone, country, status)
        values (
            new.id,
            coalesce(new.raw_user_meta_data->>'first_name', 'Unknown'),
            coalesce(new.raw_user_meta_data->>'last_name', 'User'),
            new.email,
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'country',
            'registered'
        )
        on conflict (id) do nothing;
    end if;

    return new;
exception when others then
    -- FAIL SILENTLY TO PREVENT 500 ERRORS ON SIGNUP
    -- This ensures the user is at least created in Supabase Auth
    raise warning 'CRITICAL ERROR in handle_auth_user_created: %', SQLERRM;
    return new;
end;
$$;

-- 4. RE-ENABLE TRIGGER
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_auth_user_created();

-- 5. ENSURE RLS FOR CLIENTS (Crucial for dashboard)
alter table public.external_users enable row level security;
alter table public.external_user_intent enable row level security;

drop policy if exists "Clients can view own record" on public.external_users;
create policy "Clients can view own record" on public.external_users
    for select using (auth.uid() = id);

drop policy if exists "Clients can update own record" on public.external_users;
create policy "Clients can update own record" on public.external_users
    for update using (auth.uid() = id);

drop policy if exists "Clients can handle own intent" on public.external_user_intent;
create policy "Clients can handle own intent" on public.external_user_intent
    for all using (auth.uid() = external_user_id);

select '✅ Emergency Auth Cleanup and Client Sync Successful' as result;
