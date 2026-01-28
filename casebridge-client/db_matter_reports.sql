-- ========================================================
-- MATTER REPORTS & ACTIVITY SCHEMA V1
-- ========================================================

-- 1. Create Matter Reports Table
create table if not exists public.matter_reports (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid not null references public.matters(id) on delete cascade,
    author_id uuid not null references auth.users(id),
    title text not null,
    content text not null,
    is_final boolean default false,
    created_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.matter_reports enable row level security;

-- 3. RLS Policies
create policy "Staff can view reports for their firm matters"
on public.matter_reports for select
using (
    exists (
        select 1 from public.matters m
        join public.user_firm_roles ufr on ufr.firm_id = m.firm_id
        where m.id = public.matter_reports.matter_id
        and ufr.user_id = auth.uid()
        and ufr.status = 'active'
    )
);

create policy "Staff can insert reports for their firm matters"
on public.matter_reports for insert
with check (
    exists (
        select 1 from public.matters m
        join public.user_firm_roles ufr on ufr.firm_id = m.firm_id
        where m.id = matter_id
        and ufr.user_id = auth.uid()
        and ufr.status = 'active'
    )
);

-- 4. Trigger for "First Report triggers In Progress"
create or replace function public.handle_report_submission_logic()
returns trigger
language plpgsql
security definer
as $$
declare
    v_current_state public.matter_lifecycle_state;
    v_report_count int;
begin
    -- Get current state
    select lifecycle_state into v_current_state
    from public.matters
    where id = new.matter_id;

    -- If state is 'under_review', the first report moves it to 'in_progress'
    if v_current_state = 'under_review' then
        perform public.transition_matter_lifecycle(new.matter_id, 'in_progress');
    end if;

    -- Log Event
    perform public.log_firm_event(
        (select firm_id from public.matters where id = new.matter_id),
        'report_submitted',
        jsonb_build_object('matter_id', new.matter_id, 'report_id', new.id, 'is_final', new.is_final)
    );

    return new;
end;
$$;

create trigger on_report_submitted
after insert on public.matter_reports
for each row execute function public.handle_report_submission_logic();

-- 5. Audit for reassignment (Handled via update trigger on matters table or manual log in RPC)
-- Let's add a trigger for assignment logging if we want it automatic.
create or replace function public.handle_matter_assignment_audit()
returns trigger
language plpgsql
security definer
as $$
begin
    if (old.assigned_associate is distinct from new.assigned_associate) or (old.assigned_attorney_id is distinct from new.assigned_attorney_id) then
         perform public.log_firm_event(
            new.firm_id,
            'case_reassigned',
            jsonb_build_object(
                'matter_id', new.id,
                'old_assignee', coalesce(old.assigned_associate, old.assigned_attorney_id),
                'new_assignee', coalesce(new.assigned_associate, new.assigned_attorney_id)
            )
        );
    end if;
    return new;
end;
$$;

-- Wait, matters table has both assigned_associate (from earlier) and assigned_attorney_id (from lifecycle v1).
-- I should probably unify or at least check both.
-- For now, I'll link it to both just in case.

create trigger on_matter_reassigned
after update on public.matters
for each row execute function public.handle_matter_assignment_audit();

select '✅ Matter Reports & Activity Schema V1 Applied' as status;
