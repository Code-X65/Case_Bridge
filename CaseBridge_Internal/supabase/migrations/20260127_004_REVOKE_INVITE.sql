-- ==========================================
-- LIVE REVOKE PROCEDURE
-- ==========================================

CREATE OR REPLACE FUNCTION public.revoke_secure_invitation(
    p_invite_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations WHERE id = p_invite_id;
    
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invitation not found.';
    END IF;

    IF NOT public.i_am_admin(v_invite.firm_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can revoke invitations.';
    END IF;

    -- Update status to 'expired' instead of deleting
    UPDATE public.invitations
    SET status = 'expired'
    WHERE id = p_invite_id;

    -- Audit Log
    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), v_invite.firm_id, 'staff_invite_revoked', jsonb_build_object(
        'email', v_invite.email,
        'invite_id', p_invite_id
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Revoke procedure added and audit logging enabled.' AS status;
