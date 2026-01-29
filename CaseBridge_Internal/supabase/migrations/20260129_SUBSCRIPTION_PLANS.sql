-- ==========================================================
-- SUBSCRIPTION ENGINE: PLAN MANAGEMENT
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'NGN',
    features JSONB DEFAULT '[]'::jsonb, -- Array of strings/objects for features
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage firm plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage firm plans" ON public.subscription_plans
    FOR ALL
    USING (public.is_firm_admin(firm_id))
    WITH CHECK (public.is_firm_admin(firm_id));

DROP POLICY IF EXISTS "Firm members can view plans" ON public.subscription_plans;
CREATE POLICY "Firm members can view plans" ON public.subscription_plans
    FOR SELECT
    USING (firm_id IN (SELECT f_id FROM public.get_my_firms()));

DROP POLICY IF EXISTS "Public can view active plans" ON public.subscription_plans;
CREATE POLICY "Public can view active plans" ON public.subscription_plans
    FOR SELECT
    USING (status = 'active');

-- Audit Logging
CREATE OR REPLACE FUNCTION public.audit_subscription_plans()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), NEW.firm_id, 'subscription_plan_created', NEW.id, jsonb_build_object('name', NEW.name, 'price', NEW.price));
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), NEW.firm_id, 'subscription_plan_updated', NEW.id, jsonb_build_object('name', NEW.name, 'old_price', OLD.price, 'new_price', NEW.price));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), OLD.firm_id, 'subscription_plan_deleted', OLD.id, jsonb_build_object('name', OLD.name));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_subscription_plans
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_plans();

SELECT '✅ Subscription Plans table and governance active.' as status;
