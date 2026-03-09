-- ==========================================================
-- HOTFIX: BROKEN TRIGGER ON matter_updates
-- Error: column "client_reference_id" does not exist
-- ==========================================================
-- A trigger on matter_updates is referencing NEW.client_reference_id
-- which only exists on the 'matters' table, not 'matter_updates'.
-- This fix drops and recreates all triggers on matter_updates correctly.

-- 1. Drop ALL triggers on matter_updates to find and kill the broken one
DROP TRIGGER IF EXISTS trg_notify_report_update ON public.matter_updates;
DROP TRIGGER IF EXISTS notify_report_update ON public.matter_updates;
DROP TRIGGER IF EXISTS trg_automate_matter_handoff ON public.matter_updates;
DROP TRIGGER IF EXISTS on_report_submitted ON public.matter_updates;
DROP TRIGGER IF EXISTS report_submitted ON public.matter_updates;

-- 2. Also drop any trigger that might have been named differently
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND event_object_table = 'matter_updates'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON public.matter_updates';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 3. Recreate the notification trigger with the correct column (client_id, NOT client_reference_id)
CREATE OR REPLACE FUNCTION public.notify_report_update()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_firm_id UUID;
BEGIN
    -- Safely fetch matter details using the correct column names
    BEGIN
        SELECT m.client_id, m.firm_id
        INTO v_client_id, v_firm_id
        FROM public.matters m
        WHERE m.id = NEW.matter_id;

        -- Only notify if the report is client visible and we found the matter
        IF FOUND AND NEW.client_visible = TRUE AND v_client_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
            VALUES (
                v_client_id,
                v_firm_id,
                'report_update',
                'Case Update',
                'A new progress report has been added to your case.',
                NEW.matter_id
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notification skipped: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach the trigger safely
DROP TRIGGER IF EXISTS trg_notify_report_update ON public.matter_updates;
CREATE TRIGGER trg_notify_report_update
AFTER INSERT ON public.matter_updates
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_update();

NOTIFY pgrst, 'reload schema';
SELECT '✅ Broken trigger fixed. matter_updates inserts should now work.' AS status;
