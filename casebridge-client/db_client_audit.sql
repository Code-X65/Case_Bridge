-- CLIENT AUDIT LOGGING RPC
-- Allows authenticated clients to securely log specific events

create or replace function public.log_client_event(p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Ensure user is authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert into audit_logs if it exists
  -- We use dynamic SQL or just straightforward insert if we are sure the table exists.
  -- To be safe given the "Internal" dependency, we try-catch.
  begin
    insert into public.audit_logs (actor_id, firm_id, action, metadata)
    values (
      auth.uid(),
      null, -- Clients don't have a firm_id in the internal sense, or we could leave it null
      p_action,
      p_details
    );
  exception when others then
    -- If audit_logs doesn't exist or fails, we log to Postgres logs
    raise warning 'Client Audit Log Failed: % % %', auth.uid(), p_action, p_details;
  end;
end;
$$;

select '✅ Client Audit RPC created' as status;
