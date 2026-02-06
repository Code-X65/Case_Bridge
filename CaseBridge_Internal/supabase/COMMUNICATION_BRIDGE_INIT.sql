-- EMAIL BRIDGE & COMMUNICATION INFRASTRUCTURE (Roadmap #8)

-- 1. Create Matter Communications Table
-- Stores emails and other external comms bridged into CaseBridge
CREATE TABLE IF NOT EXISTS public.matter_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    type TEXT CHECK (type IN ('email', 'call', 'sms', 'other')) DEFAULT 'email',
    sender_identity TEXT, -- Email address or phone number
    recipient_identity TEXT,
    subject TEXT,
    content_text TEXT,
    content_html TEXT,
    external_message_id TEXT, -- e.g. Outlook/Gmail message ID
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Index for fast matter lookups
CREATE INDEX IF NOT EXISTS idx_matter_comms_matter_id ON public.matter_communications(matter_id);

-- 3. RLS Policies
ALTER TABLE public.matter_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_view_all_comms" ON public.matter_communications
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "staff_insert_comms" ON public.matter_communications
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- 4. Audit Log
INSERT INTO public.audit_logs (action, table_name, record_id, metadata)
VALUES ('comm_infrastructure_deployed', 'matter_communications', null, '{"info": "Email Bridge Table Created"}');

SELECT '✅ Communication Bridge Infrastructure Initialized' as status;
