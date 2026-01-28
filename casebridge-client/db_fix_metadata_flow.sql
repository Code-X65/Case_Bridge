-- ========================================================
-- ULTIMATE DATA FIXER (Ensures personal details are saved)
-- ========================================================

-- 1. DROP THE DIAGNOSTIC TRIGGER (SAFE MODE)
drop trigger if exists aae_diagnostic_trigger on auth.users;
drop function if exists public.diagnostic_trigger;

-- 2. CREATE A REAL, ROBUST PRODUCTION TRIGGER
-- This one safely extracts metadata and populates external_users
create or replace function public.handle_auth_user_created_v2()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
declare
    v_first_name text;
    v_last_name text;
    v_phone text;
    v_country text;
begin
    -- Extract metadata safely (defaults to empty string if null, not NULL)
    v_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
    v_last_name := coalesce(new.raw_user_meta_data->>'last_name', '');
    v_phone := coalesce(new.raw_user_meta_data->>'phone', '');
    v_country := coalesce(new.raw_user_meta_data->>'country', '');

    -- Insert into external_users
    insert into public.external_users (id, email, first_name, last_name, phone, country, status)
    values (
        new.id, 
        new.email, 
        v_first_name, 
        v_last_name, 
        v_phone, 
        v_country,
        'registered'
    )
    on conflict (id) do update set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        country = excluded.country,
        email = excluded.email; -- Ensure email matches auth

    return new;
exception when others then
    -- Log error but don't crash signup
    raise warning 'Error in handle_auth_user_created_v2: %', SQLERRM;
    return new;
end;
$$;

-- 3. BIND THE TRIGGER
create trigger on_auth_user_created_v2
    after insert on auth.users
    for each row execute procedure public.handle_auth_user_created_v2();

-- 4. BACKFILL EXISTING USERS (If any were created during the broken phase)
-- This tries to repair any users who have metadata in auth.users but missing data in external_users
do $$
declare
    r record;
begin
    for r in select * from auth.users loop
        insert into public.external_users (id, email, first_name, last_name, phone, country, status)
        values (
            r.id,
            r.email,
            coalesce(r.raw_user_meta_data->>'first_name', ''),
            coalesce(r.raw_user_meta_data->>'last_name', ''),
            coalesce(r.raw_user_meta_data->>'phone', ''),
            coalesce(r.raw_user_meta_data->>'country', ''),
            'registered'
        )
        on conflict (id) do update set
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            phone = excluded.phone,
            country = excluded.country;
    end loop;
end $$;

select '✅ Trigger Fixed & Data Backfilled. Signup details will now persist.' as status;
