-- ========================================================
-- CASE REPORTING SCHEMA (CLIENT PORTAL v1)
-- ========================================================

-- 1. Create case_reports table
create type report_status as enum ('submitted', 'under_review', 'accepted', 'rejected');

create table public.case_reports (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.external_users(id),
    category text not null,
    title text not null,
    description text not null,
    jurisdiction text,
    status report_status not null default 'submitted',
    created_at timestamp with time zone default now()
);

-- 2. Create case_report_documents table
create table public.case_report_documents (
    id uuid primary key default gen_random_uuid(),
    case_report_id uuid not null references public.case_reports(id),
    file_name text not null,
    file_path text not null, -- Stores Storage path
    file_type text not null,
    file_size bigint not null,
    uploaded_at timestamp with time zone default now()
);

-- 3. Enable RLS
alter table public.case_reports enable row level security;
alter table public.case_report_documents enable row level security;

-- 4. Policies for case_reports
-- Client can view ONLY their own reports
create policy "Clients can view own reports"
on public.case_reports for select
using (auth.uid() = client_id);

-- Client can insert reports (once submitted, it's done)
create policy "Clients can submit reports"
on public.case_reports for insert
with check (auth.uid() = client_id);

-- 5. Policies for documents
-- Client can view documents for their own reports
create policy "Clients can view own documents"
on public.case_report_documents for select
using (
    exists (
        select 1 from public.case_reports 
        where id = case_report_documents.case_report_id 
        and client_id = auth.uid()
    )
);

-- Client can upload documents for their own reports
create policy "Clients can upload documents"
on public.case_report_documents for insert
with check (
    exists (
        select 1 from public.case_reports 
        where id = case_report_documents.case_report_id 
        and client_id = auth.uid()
    )
);

-- 6. Storage Bucket for Case Docs
insert into storage.buckets (id, name, public)
values ('case_documents', 'case_documents', false)
on conflict (id) do nothing;

-- 7. Storage Policies
create policy "Client Upload Access"
on storage.objects for insert
with check (
    bucket_id = 'case_documents' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Client Read Access"
on storage.objects for select
using (
    bucket_id = 'case_documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
);

select '✅ Case Reporting Schema Applied' as status;
