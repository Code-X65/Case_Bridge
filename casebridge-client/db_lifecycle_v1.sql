-- ========================================================
-- CASE MANAGEMENT LIFECYCLE V1 (CANONICAL)
-- ========================================================
-- This schema enforces the 4-state lifecycle defined in the Frozen Governance Doc.
-- It replaces previous ad-hoc status columns.

-- 1. DROP OLD TYPE IF EXISTS (Recreating to enforce strict values)
-- Note: In production you'd migrate data. Here we assume clean slate or force update.
drop type if exists public.matter_lifecycle_state cascade;

-- 2. CREATE CANONICAL LIFECYCLE TYPE
create type public.matter_lifecycle_state as enum (
    'submitted',    -- Entry state (accepted from intake)
    'under_review', -- Internal review started
    'in_progress',  -- Substantive work begun (first report)
    'closed'        -- Work completed & confirmed closed
);

-- 3. UPDATE MATTERS TABLE STRUCTURE
-- We remove the old 'status' (matter_status) and replace it with 'lifecycle_state'
-- We keep 'status' column name but change type if possible, or just add new column and drop old.
-- For clarity, we will Use a NEW column `lifecycle_state` and deprecate `status`.

alter table public.matters 
add column if not exists lifecycle_state public.matter_lifecycle_state default 'submitted';

-- 4. ADD ASSIGNMENT TRACKING (Separate from State)
-- assignments are already tracked via `assigned_attorney_id` column in existing schema.
-- ensuring it exists:
alter table public.matters 
add column if not exists assigned_attorney_id uuid references auth.users(id);

-- 5. STATE TRANSITION FUNCTION (Strict Logic)
create or replace function public.transition_matter_lifecycle(
    p_matter_id uuid,
    p_new_state public.matter_lifecycle_state
)
returns void
language plpgsql
security definer
as $$
declare
    v_current_state public.matter_lifecycle_state;
    v_firm_id uuid;
begin
    -- Get current state
    select lifecycle_state, firm_id into v_current_state, v_firm_id
    from public.matters
    where id = p_matter_id;

    if not found then
        raise exception 'Matter not found';
    end if;

    -- Validate Transitions (STRICT)
    if v_current_state = p_new_state then
        return; -- No op
    end if;

    -- Submitted -> Under Review
    if v_current_state = 'submitted' and p_new_state = 'under_review' then
        -- Allowed
        null;
    
    -- Under Review -> In Progress
    elsif v_current_state = 'under_review' and p_new_state = 'in_progress' then
        -- Allowed (Triggered by first report usually, but explicit transition allowed)
        null;

    -- In Progress -> Closed
    elsif v_current_state = 'in_progress' and p_new_state = 'closed' then
        -- Allowed
        null;

    else
        raise exception 'Invalid Lifecycle Transition: % -> %', v_current_state, p_new_state;
    end if;

    -- Perform Update
    update public.matters
    set lifecycle_state = p_new_state,
        updated_at = now()
    where id = p_matter_id;

    -- Audit Log
    perform public.log_firm_event(
        v_firm_id, 
        'lifecycle_transition', 
        jsonb_build_object('from', v_current_state, 'to', p_new_state, 'matter_id', p_matter_id)
    );
end;
$$;

-- 6. MIGRATE existing data (If any matters exist from previous steps)
-- Default all 'open' matters to 'submitted'
update public.matters 
set lifecycle_state = 'submitted' 
where lifecycle_state is null;

select '✅ Canoncial Lifecycle V1 Applied' as status;
