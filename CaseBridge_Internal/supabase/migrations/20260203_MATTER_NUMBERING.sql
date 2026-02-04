-- ==========================================
-- AUTOMATED MATTER NUMBERING SYSTEM
-- ==========================================

-- 1. Create a tracking table for sequences to handle concurrency safely
CREATE TABLE IF NOT EXISTS public.firm_matter_sequences (
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    last_value INTEGER DEFAULT 0,
    PRIMARY KEY (firm_id, year)
);

-- 2. Add matter_number column to matters
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS matter_number TEXT UNIQUE;

-- 3. Trigger Function
CREATE OR REPLACE FUNCTION public.generate_matter_number()
RETURNS TRIGGER AS $$
DECLARE
    f_prefix TEXT;
    f_year INTEGER;
    f_seq INTEGER;
BEGIN
    -- Only generate if not already set (allows manual override if needed)
    IF NEW.matter_number IS NULL THEN
        -- Get Firm Prefix (defaults to CB-)
        SELECT COALESCE(matter_numbering_prefix, 'CB-') INTO f_prefix 
        FROM public.firms WHERE id = NEW.firm_id;
        
        -- Current Year
        f_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        -- Atomic increment of sequence
        INSERT INTO public.firm_matter_sequences (firm_id, year, last_value)
        VALUES (NEW.firm_id, f_year, 1)
        ON CONFLICT (firm_id, year) 
        DO UPDATE SET last_value = public.firm_matter_sequences.last_value + 1
        RETURNING last_value INTO f_seq;
        
        -- Format: [PREFIX][YEAR]-[SEQ] (e.g., CB-2026-001)
        -- We use LPAD to ensure 3 digits (001, 002...)
        NEW.matter_number := f_prefix || f_year::text || '-' || LPAD(f_seq::text, 3, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Trigger
DROP TRIGGER IF EXISTS trg_generate_matter_number ON public.matters;
CREATE TRIGGER trg_generate_matter_number
BEFORE INSERT ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.generate_matter_number();

-- 5. Backfill existing matters if any (optional, but good for consistency)
-- This might be complex if there are many, but for a new system:
UPDATE public.matters SET matter_number = NULL WHERE matter_number IS NULL;

SELECT '✅ Automated Matter Numbering System initialized.' AS status;
