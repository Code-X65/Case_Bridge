-- 1. Create Client Profiles Table (Linked to auth.users)
CREATE TABLE public.client_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Client Documents Table
CREATE TABLE public.client_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    client_id UUID REFERENCES public.client_profiles(id) NOT NULL,
    matter_id UUID REFERENCES public.matters(id), -- Optional link to matter
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Client Profile: View own profile
CREATE POLICY "Clients view own profile" 
ON public.client_profiles 
FOR SELECT 
USING (
    id = auth.uid()
);

-- Client Documents: View own documents
CREATE POLICY "Clients view own documents" 
ON public.client_documents 
FOR SELECT 
USING (
    client_id = auth.uid()
);

-- Client Documents: Upload own documents
CREATE POLICY "Clients upload own documents" 
ON public.client_documents 
FOR INSERT 
WITH CHECK (
    client_id = auth.uid()
);

-- Internal Staff Access to Client Data

-- Admins/CMs/Associates can view Client Profiles for their firm
CREATE POLICY "Staff view firm clients" 
ON public.client_profiles 
FOR SELECT 
USING (
    exists (
        select 1 from public.session_context 
        where firm_id = client_profiles.firm_id 
        and role IN ('admin', 'admin_manager', 'case_manager', 'associate', 'associate_lawyer')
    )
);

-- Admins/CMs/Associates can view Client Documents for their firm/assignment
-- Simplified for V1: Staff can view all documents for their firm
CREATE POLICY "Staff view firm client documents" 
ON public.client_documents 
FOR SELECT 
USING (
    exists (
        select 1 from public.session_context 
        where firm_id = client_documents.firm_id 
        and role IN ('admin', 'admin_manager', 'case_manager', 'associate', 'associate_lawyer')
    )
);

-- FALLBACK RLS (Direct Table Check if session_context missing)
CREATE POLICY "Staff view firm clients fallback" 
ON public.client_profiles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = client_profiles.firm_id 
        AND status = 'active'
    )
);

CREATE POLICY "Staff view firm client documents fallback" 
ON public.client_documents 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = client_documents.firm_id 
        AND status = 'active'
    )
);

-- 5. Audit Log for Document Upload
CREATE OR REPLACE FUNCTION public.audit_client_upload()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        auth.uid(), 
        NEW.firm_id, 
        'client_document_uploaded', 
        NEW.id, 
        jsonb_build_object('file_name', NEW.file_name)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_client_upload
AFTER INSERT ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_client_upload();
