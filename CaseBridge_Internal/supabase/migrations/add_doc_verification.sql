-- Add verification_status to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending' 
CHECK (verification_status IN ('Pending', 'Verified', 'Unverified'));

-- Update RLS for internal users to update document status
DROP POLICY IF EXISTS "Internal users can update document verification" ON public.documents;
CREATE POLICY "Internal users can update document verification"
ON public.documents FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

NOTIFY pgrst, 'reload schema';
