-- ==========================================================
-- FIRM GOVERNANCE: BILLING & PLATFORM SUBSCRIPTIONS
-- ==========================================================

-- 1. Create Subscription Tiers Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'firm_subscription_tier') THEN
        CREATE TYPE firm_subscription_tier AS ENUM ('trial', 'basic', 'pro', 'enterprise');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'firm_subscription_status') THEN
        CREATE TYPE firm_subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
    END IF;
END $$;

-- 2. Firm Subscriptions Table
CREATE TABLE IF NOT EXISTS public.firm_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE UNIQUE NOT NULL,
    tier firm_subscription_tier DEFAULT 'trial',
    status firm_subscription_status DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payment History / Invoices
CREATE TABLE IF NOT EXISTS public.firm_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'NGN',
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    payment_method TEXT,
    transaction_reference TEXT UNIQUE,
    invoice_url TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. RLS Configuration
ALTER TABLE public.firm_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_payments ENABLE ROW LEVEL SECURITY;

-- Admins can view their own firm's subscription
CREATE POLICY "Admins view own subscription" 
ON public.firm_subscriptions FOR SELECT 
USING (public.is_firm_admin(firm_id));

-- Admins can view their own firm's payments
CREATE POLICY "Admins view own payments" 
ON public.firm_payments FOR SELECT 
USING (public.is_firm_admin(firm_id));

-- 5. Trigger for automated subscription creation on firm registration
CREATE OR REPLACE FUNCTION public.handle_new_firm_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.firm_subscriptions (firm_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_firm_created_subscription ON public.firms;
CREATE TRIGGER trigger_on_firm_created_subscription
AFTER INSERT ON public.firms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_firm_subscription();

-- Backfill existing firms
INSERT INTO public.firm_subscriptions (firm_id)
SELECT id FROM public.firms
ON CONFLICT (firm_id) DO NOTHING;

-- 6. Audit Logging
CREATE OR REPLACE FUNCTION public.audit_firm_billing()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'firm_subscriptions') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), NEW.firm_id, 'subscription_updated', NEW.id, jsonb_build_object('new_tier', NEW.tier, 'new_status', NEW.status));
    ELSIF (TG_TABLE_NAME = 'firm_payments') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), NEW.firm_id, 'payment_received', NEW.id, jsonb_build_object('amount', NEW.amount, 'reference', NEW.transaction_reference));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_firm_subscriptions
AFTER UPDATE ON public.firm_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_firm_billing();

CREATE TRIGGER trigger_audit_firm_payments
AFTER INSERT ON public.firm_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_firm_billing();

SELECT '✅ Firm Billing Schema and Trial Automation Active.' as status;
