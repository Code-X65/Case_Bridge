-- ==========================================
-- PHASE 3: COURT/PACER SYNC BRIDGE
-- ==========================================

-- 1. Court Dockets
CREATE TABLE IF NOT EXISTS public.court_dockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    court_name TEXT NOT NULL,
    case_number TEXT NOT NULL,
    pacer_case_id TEXT,
    last_sync_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(court_name, case_number)
);

-- 2. Docket Filings
CREATE TABLE IF NOT EXISTS public.docket_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docket_id UUID REFERENCES public.court_dockets(id) ON DELETE CASCADE,
    entry_number INTEGER,
    filed_date DATE NOT NULL,
    description TEXT NOT NULL,
    pacer_doc_id TEXT,
    is_deadline_trigger BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE public.court_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docket_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_access_dockets" ON public.court_dockets;
CREATE POLICY "firm_access_dockets" ON public.court_dockets
FOR ALL TO authenticated USING (
    matter_id IN (
        SELECT id FROM public.matters 
        WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
    )
);

DROP POLICY IF EXISTS "firm_access_filings" ON public.docket_filings;
CREATE POLICY "firm_access_filings" ON public.docket_filings
FOR ALL TO authenticated USING (
    docket_id IN (
        SELECT id FROM public.court_dockets 
        WHERE matter_id IN (
            SELECT id FROM public.matters 
            WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
        )
    )
);

-- 4. Mock Sync Function (RPC)
CREATE OR REPLACE FUNCTION public.mock_pacer_sync(p_docket_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.docket_filings (docket_id, entry_number, filed_date, description, is_deadline_trigger)
    VALUES 
    (p_docket_id, 1, CURRENT_DATE - INTERVAL '10 days', 'Complaint Filed', FALSE),
    (p_docket_id, 2, CURRENT_DATE - INTERVAL '5 days', 'Motion for Summary Judgment', TRUE),
    (p_docket_id, 3, CURRENT_DATE, 'Notice of Appearance', FALSE);
    
    UPDATE public.court_dockets SET last_sync_at = NOW() WHERE id = p_docket_id;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Court/PACER Sync Schema Initialized.' AS status;
