-- ==========================================
-- PHASE 3: CONFLICT OF INTEREST ENGINE
-- ==========================================

-- 1. Enable Trigram Extension for Fuzzy Searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Conflict Search RPC
-- Searches across clients, adverse parties, and potential contacts
CREATE OR REPLACE FUNCTION public.search_conflicts(
    search_query TEXT,
    firm_id_filter UUID
)
RETURNS TABLE (
    match_type TEXT,
    match_name TEXT,
    match_id UUID,
    matter_id UUID,
    matter_title TEXT,
    similarity_score REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- A. Match against EXISTING CLIENTS
    SELECT 
        'Client'::TEXT as match_type,
        eu.first_name || ' ' || eu.last_name as match_name,
        eu.id as match_id,
        null::UUID as matter_id,
        null::TEXT as matter_title,
        similarity(eu.first_name || ' ' || eu.last_name, search_query) as similarity_score
    FROM public.external_users eu
    JOIN public.matters m_check ON m_check.client_id = eu.id
    WHERE m_check.firm_id = firm_id_filter
    AND similarity(eu.first_name || ' ' || eu.last_name, search_query) > 0.3

    UNION ALL

    -- B. Match against ADVERSE PARTIES in existing matters
    SELECT 
        'Adverse Party'::TEXT as match_type,
        m.adverse_parties as match_name,
        m.id as match_id,
        m.id as matter_id,
        m.title as matter_title,
        similarity(m.adverse_parties, search_query) as similarity_score
    FROM public.matters m
    WHERE m.firm_id = firm_id_filter
    AND similarity(m.adverse_parties, search_query) > 0.3

    ORDER BY similarity_score DESC;
END;
$$;

SELECT '✅ Conflict of Interest Engine Initialized.' AS status;
