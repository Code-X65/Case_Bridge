-- ==========================================
-- HOTFIX: CONFLICT SEARCH RPC RESTORATION
-- ==========================================
-- 1. Restore the original signature (2 parameters)
-- 2. Fix similarity(jsonb, text) mismatch by casting to text

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
    -- We search external_users joined to matters within the same firm
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
    -- Since adverse_parties is JSONB, we cast to TEXT for similarity matching
    -- We use a CROSS JOIN to handle the jsonb_array_elements_text if it's an array, 
    -- or just match against the whole text representation if it's stored differently.
    -- To keep it simple and robust:
    SELECT 
        'Adverse Party'::TEXT as match_type,
        m.adverse_parties::TEXT as match_name,
        m.id as match_id,
        m.id as matter_id,
        m.title as matter_title,
        similarity(m.adverse_parties::TEXT, search_query) as similarity_score
    FROM public.matters m
    WHERE m.firm_id = firm_id_filter
    -- Ensure we don't return similarity scores for empty/default jsonb arrays
    AND m.adverse_parties IS NOT NULL 
    AND m.adverse_parties::TEXT != '[]'
    AND similarity(m.adverse_parties::TEXT, search_query) > 0.3

    ORDER BY similarity_score DESC;
END;
$$;

SELECT '✅ Conflict Search RPC Hotfixed (Signature: search_conflicts(text, uuid))' AS status;
