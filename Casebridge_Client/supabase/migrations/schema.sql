-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Create matters table
CREATE TABLE IF NOT EXISTS public.matters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    matter_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    matter_type TEXT NOT NULL DEFAULT 'Others',
    service_tier TEXT DEFAULT 'Standard',
    status TEXT DEFAULT 'Pending Review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for matters
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own matters" ON public.matters;
CREATE POLICY "Clients can view their own matters"
ON public.matters FOR SELECT
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create their own matters" ON public.matters;
CREATE POLICY "Clients can create their own matters"
ON public.matters FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own documents" ON public.documents;
CREATE POLICY "Clients can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can upload their own documents" ON public.documents;
CREATE POLICY "Clients can upload their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    appointment_type TEXT NOT NULL, -- 'Virtual' or 'Physical'
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
CREATE POLICY "Clients can view their own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can book their own appointments" ON public.appointments;
CREATE POLICY "Clients can book their own appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
CREATE POLICY "Clients can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create their own invoices" ON public.invoices;
CREATE POLICY "Clients can create their own invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own payments" ON public.payments;
CREATE POLICY "Clients can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can record their own payments" ON public.payments;
CREATE POLICY "Clients can record their own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'client'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE SETUP
-- 1. Create the 'documents' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Allow users to upload files to their own folder within the 'documents' bucket
DROP POLICY IF EXISTS "Allow individual uploads" ON storage.objects;
CREATE POLICY "Allow individual uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to view/download their own files
DROP POLICY IF EXISTS "Allow individual selects" ON storage.objects;
CREATE POLICY "Allow individual selects"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Allow individual deletes" ON storage.objects;
CREATE POLICY "Allow individual deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[2] = auth.uid()::text
);
