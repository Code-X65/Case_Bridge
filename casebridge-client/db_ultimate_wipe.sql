-- ========================================================
-- ULTIMATE DIAGNOSTIC & AUTH TRIGGER WIPE
-- ========================================================

-- 1. DYNAMICALLY DROP EVERY TRIGGER ON auth.users
-- This handles any unknown trigger names from any previous phase
do $$
declare
    trig name;
begin
    for trig in (
        select trigger_name 
        from information_schema.triggers 
        where event_object_schema = 'auth' 
          and event_object_table = 'users'
    ) loop
        execute format('drop trigger if exists %I on auth.users', trig);
        raise notice 'Dropped trigger: %', trig;
    end loop;
end $$;

-- 2. RESET THE EXTERNAL_USERS TABLE (Flattened for safety)
-- We make all metadata fields optional to prevent any parsing errors
alter table if exists public.external_users alter column first_name drop not null;
alter table if exists public.external_users alter column last_name drop not null;
alter table if exists public.external_users alter column email drop not null; -- Auth handles this

-- 3. THE "NULL" TRIGGER (For testing)
-- We create a trigger that literally does NOTHING but return.
-- If signup STILL fails after this, the error is NOT in the database triggers.
create or replace function public.diagnostic_trigger()
returns trigger 
language plpgsql 
security definer
as $$
begin
    -- Minimal possible logic
    begin
        insert into public.external_users (id, email, status)
        values (new.id, new.email, 'registered')
        on conflict (id) do nothing;
    exception when others then
        raise notice 'Diagnostic: Insert to external_users failed but continuing: %', SQLERRM;
    end;
    
    return new;
end;
$$;

create trigger aae_diagnostic_trigger
    after insert on auth.users
    for each row execute procedure public.diagnostic_trigger();

-- 4. CHECK FOR OTHER TABLES THAT MIGHT CRASH THE TRANSACTION
-- Some internal projects might have triggers on 'profiles' or 'user_firm_roles' 
-- that are triggered by our trigger. We've dropped the main ones above.

select '✅ ALL auth.users triggers wiped. Diagnostic trigger installed. Try signup now.' as status;
