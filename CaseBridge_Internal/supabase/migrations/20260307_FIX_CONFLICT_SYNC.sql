-- ==========================================
-- CONFLICT CHECK SYSTEM FIX & ADVERSE PARTIES
-- ==========================================

-- 1. Ensure adverse_parties is JSONB (Fix for previous migrations that added it as TEXT)
DO $$ 
BEGIN 
    -- If it doesn't exist, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='adverse_parties') THEN
        ALTER TABLE public.matters ADD COLUMN adverse_parties JSONB DEFAULT '[]'::jsonb;
    -- If it exists but is NOT jsonb, convert it
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='adverse_parties' AND data_type != 'jsonb') THEN
        ALTER TABLE public.matters ALTER COLUMN adverse_parties TYPE JSONB USING 
            CASE 
                WHEN adverse_parties IS NULL OR adverse_parties = '' THEN '[]'::jsonb 
                WHEN adverse_parties LIKE '[%' THEN adverse_parties::jsonb -- Try to cast if it looks like JSON
                ELSE jsonb_build_array(adverse_parties) 
            END;
    END IF;
END $$;

-- 2. Index for search performance
CREATE INDEX IF NOT EXISTS idx_matters_adverse_parties ON public.matters USING GIN (adverse_parties);

-- 3. Fix Search RPC (Simplified logic for reliable matching across Matters and Intake)
CREATE OR REPLACE FUNCTION public.search_conflicts(p_query TEXT)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    match_reason TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    -- Search in Matters (Adverse Parties)
    SELECT 
        m.id, 
        'matter'::TEXT, 
        m.title,
        'Matched adverse party: ' || val::TEXT,
        m.created_at
    FROM public.matters m, jsonb_array_elements_text(m.adverse_parties) val
    WHERE val ILIKE '%' || p_query || '%'
    
    UNION ALL
    
    -- Search in Matters (Client Name/Matter Title)
    SELECT 
        m.id, 
        'matter'::TEXT, 
        m.title,
        'Matched matter title/participant: ' || m.title,
        m.created_at
    FROM public.matters m
    WHERE m.title ILIKE '%' || p_query || '%'
    
    UNION ALL
    
    -- Search in Intake Forms
    SELECT 
        i.id, 
        'intake'::TEXT, 
        i.client_name,
        'Matched potential adverse party in intake: ' || i.adverse_party_name,
        i.created_at
    FROM public.intake_forms i
    WHERE i.adverse_party_name ILIKE '%' || p_query || '%' 
       OR i.client_name ILIKE '%' || p_query || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Conflict Check system fixed and Adverse Parties column enabled' AS status;
