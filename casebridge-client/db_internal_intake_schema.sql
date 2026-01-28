-- ========================================================
-- INTERNAL INTAKE & MATTER SCHEMA
-- ========================================================

-- 1. Extend case_reports with Firm Preference
alter table public.case_reports 
add column if not exists preferred_firm_id uuid references public.firms(id);

-- 2. Create Matters Table
create type matter_status as enum ('open', 'pending', 'closed', 'archived');
create type matter_priority as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.matters (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id),
    client_id uuid not null references public.external_users(id),
    case_report_id uuid unique references public.case_reports(id), -- 1:1 link
    title text not null,
    description text,
    status matter_status default 'open',
    priority matter_priority default 'medium',
    
    -- Internal fields
    assigned_attorney_id uuid references auth.users(id),
    
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 3. Enable RLS on Matters
alter table public.matters enable row level security;

-- 4. RLS for Matters (Firm Scoped)
create policy "Staff can view firm matters"
on public.matters for select
using (
    exists (
        select 1 from public.user_firm_roles ufr
        where ufr.user_id = auth.uid()
        and ufr.firm_id = public.matters.firm_id
        and ufr.status = 'active'
    )
);

create policy "Staff can insert firm matters"
on public.matters for insert
with check (
    exists (
        select 1 from public.user_firm_roles ufr
        where ufr.user_id = auth.uid()
        and ufr.firm_id = public.matters.firm_id
        and ufr.status = 'active'
    )
);

create policy "Staff can update firm matters"
on public.matters for update
using (
    exists (
        select 1 from public.user_firm_roles ufr
        where ufr.user_id = auth.uid()
        and ufr.firm_id = public.matters.firm_id
        and ufr.status = 'active'
    )
);

-- 5. RLS for Case Reports (INTERNAL ACCESS)
-- Clients already have their policies (see db_case_reporting_schema.sql)
-- We need to add STAFF policies.

create policy "Staff can view relevant case reports"
on public.case_reports for select
using (
    exists (
        select 1 from public.user_firm_roles ufr
        where ufr.user_id = auth.uid()
        and ufr.status = 'active'
        and (
            -- Direct assignment or General Pool
            public.case_reports.preferred_firm_id = ufr.firm_id
            or
            public.case_reports.preferred_firm_id is null
        )
    )
);

create policy "Staff can update relevant case reports"
on public.case_reports for update
using (
    exists (
        select 1 from public.user_firm_roles ufr
        where ufr.user_id = auth.uid()
        and ufr.status = 'active'
        and (
           public.case_reports.preferred_firm_id = ufr.firm_id
           or
           public.case_reports.preferred_firm_id is null
        )
    )
);

-- 6. Audit Event Helper for Internal
-- We assume log_internal_event exists or similar, but let's make sure we can log
-- The client audit log was `log_client_event`.
-- We probably need `log_internal_event`.

create or replace function public.log_firm_event(p_firm_id uuid, p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (actor_id, firm_id, action, metadata)
  values (auth.uid(), p_firm_id, p_action, p_details);
end;
$$;

select '✅ Internal Intake Schema Applied' as status;
