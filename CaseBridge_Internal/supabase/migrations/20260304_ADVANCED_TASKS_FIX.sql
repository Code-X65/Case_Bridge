-- ==========================================
-- ADVANCED TASK MANAGEMENT ENHANCEMENTS (FIXED)
-- Targetting the correct 'matter_tasks' table
-- ==========================================

-- 1. Enhance matter_tasks with Dependencies and Recurrence
ALTER TABLE public.matter_tasks 
ADD COLUMN IF NOT EXISTS depends_on_id UUID REFERENCES public.matter_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT, -- iCal RRULE format
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.matter_tasks(id) ON DELETE CASCADE;

-- 2. Enhance task_templates for Automated Workflows
ALTER TABLE public.task_templates
ADD COLUMN IF NOT EXISTS depends_on_template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

-- 3. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matter_tasks_depends_on ON public.matter_tasks(depends_on_id);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_parent_task ON public.matter_tasks(parent_task_id);

-- 4. Validation Trigger for Circular Dependencies in matter_tasks
CREATE OR REPLACE FUNCTION public.check_matter_task_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
    curr_id UUID;
BEGIN
    IF NEW.depends_on_id IS NOT NULL THEN
        curr_id := NEW.depends_on_id;
        WHILE curr_id IS NOT NULL LOOP
            IF curr_id = NEW.id THEN
                RAISE EXCEPTION 'Circular dependency detected in matter_tasks.';
            END IF;
            SELECT depends_on_id INTO curr_id FROM public.matter_tasks WHERE id = curr_id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_matter_task_dependency_cycle ON public.matter_tasks;
CREATE TRIGGER trg_check_matter_task_dependency_cycle
BEFORE INSERT OR UPDATE OF depends_on_id ON public.matter_tasks
FOR EACH ROW EXECUTE FUNCTION public.check_matter_task_dependency_cycle();

SELECT '✅ Advanced Task Management Schema Applied to matter_tasks and templates.' AS status;
