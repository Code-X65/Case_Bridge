-- Add client_id to matters table
ALTER TABLE public.matters 
ADD COLUMN client_reference_id UUID REFERENCES public.client_profiles(id);

-- Update RLS for Matters to allow Client Access
CREATE POLICY "Clients view own matters" 
ON public.matters 
FOR SELECT 
USING (
    client_reference_id = auth.uid()
);

-- Update notifications to support Client notifications? 
-- Prompt says "Receive notifications".
-- We need to ensure 'notifications' table works for clients too.
-- The 'notifications' table references 'profiles(id)'. 
-- It should probably reference 'auth.users(id)' to support both internal and client users, 
-- or we need a separate 'client_notifications' table.
-- Given 'profiles' is for internal, let's change 'notifications.user_id' to reference 'auth.users(id)' instead of 'profiles(id)' 
-- OR create 'client_notifications'.
-- Changing the FK constraint on existing table is cleaner for a unified notification system if possible, 
-- but might break existing strict assumptions.
-- Let's create `client_notifications` for v1 to be safe and isolated.

CREATE TABLE public.client_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    client_id UUID REFERENCES public.client_profiles(id) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own notifications" 
ON public.client_notifications 
FOR SELECT 
USING (
    client_id = auth.uid()
);
