const { supabase } = require('../config/supabase');
const crypto = require('crypto');

/**
 * Invite a new staff member
 */
const inviteStaff = async (req, res, next) => {
    try {
        const { email, role, firstName, lastName, firmId, invitedBy } = req.body;

        if (!email || !role || !firmId) {
            const err = new Error('Email, role, and firmId are required');
            err.status = 400;
            throw err;
        }

        const v_token = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
        const v_expires_at = new Date();
        v_expires_at.setHours(v_expires_at.getHours() + 72);

        // 1. Create Invite record manually
        const { data: inviteData, error: inviteError } = await supabase
            .from('invitations')
            .insert({
                firm_id: firmId,
                email: email,
                role_preassigned: role,
                token: v_token,
                status: 'pending',
                invited_by: invitedBy || null, // Optional UUID of the inviter
                expires_at: v_expires_at.toISOString(),
                first_name: firstName,
                last_name: lastName
            })
            .select()
            .single();

        if (inviteError) {
            console.error('[staffController.inviteStaff] Supabase Error:', inviteError);
            throw inviteError;
        }

        // 2. Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: invitedBy || null,
            firm_id: firmId,
            action: 'staff_invited',
            metadata: { email, role, firm_id: firmId, first_name: firstName, last_name: lastName }
        });

        res.status(201).json({
            success: true,
            data: { invitation_token: v_token, id: inviteData.id }
        });
    } catch (error) {
        console.error('[staffController.inviteStaff] Error:', error.message);
        next(error);
    }
};

/**
 * Get all staff members
 */
const getStaffList = async (req, res, next) => {
    try {
        const { firm_id } = req.query;

        let query = supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                email,
                role,
                status,
                created_at,
                user_firm_roles!inner(firm_id)
            `)
            .neq('status', 'deleted');

        if (firm_id) {
            query = query.eq('user_firm_roles.firm_id', firm_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data || []
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all pending invitations
 */
const getInvitationList = async (req, res, next) => {
    try {
        const { firm_id } = req.query;

        let query = supabase
            .from('invitations')
            .select('*')
            .eq('status', 'pending');

        if (firm_id) {
            query = query.eq('firm_id', firm_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data || []
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Renew an invitation link (refresh token and expiry)
 */
const renewInviteLink = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get existing invite to for audit metadata
        const { data: existingInvite } = await supabase
            .from('invitations')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingInvite) {
            const err = new Error('Invitation not found');
            err.status = 404;
            throw err;
        }

        const newToken = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
        const newExpiry = new Date();
        newExpiry.setHours(newExpiry.getHours() + 72);

        const { data, error } = await supabase
            .from('invitations')
            .update({
                token: newToken,
                expires_at: newExpiry.toISOString(),
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: data.invited_by,
            firm_id: data.firm_id,
            action: 'staff_invite_resent',
            metadata: { email: data.email, invite_id: id }
        });

        res.status(200).json({
            success: true,
            data: {
                id: data.id,
                token: data.token,
                expires_at: data.expires_at
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update staff role
 */
const updateStaffRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, firmId, adminId } = req.body;

        if (!role) {
            const err = new Error('Role is required');
            err.status = 400;
            throw err;
        }

        // 1. Update Profile and User Firm Role
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', id);

        if (profileError) throw profileError;

        const { error: roleError } = await supabase
            .from('user_firm_roles')
            .update({ role })
            .eq('user_id', id);

        if (roleError) throw roleError;

        // 2. Update internal_sessions so the user sees the new role on next request
        await supabase
            .from('internal_sessions')
            .update({ role })
            .eq('user_id', id);

        // 3. Create Notification for Real-time Alert
        await supabase.from('notifications').insert({
            user_id: id,
            event_type: 'role_changed',
            channel: 'in_app',
            payload: {
                title: 'Role Updated',
                message: `Your role has been changed to ${role.replace('_', ' ')}.`,
                role: role,
                firm_id: firmId
            }
        });

        // 4. Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: adminId || null,
            firm_id: firmId,
            action: 'staff_role_updated',
            target_id: id,
            metadata: { new_role: role }
        });

        res.status(200).json({
            success: true,
            message: 'Role updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle staff status (block/unblock)
 */
const toggleStaffStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, firmId, adminId } = req.body; // 'active' or 'blocked'

        if (!['active', 'blocked'].includes(status)) {
            const err = new Error('Invalid status. Must be active or blocked');
            err.status = 400;
            throw err;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        // Also update in user_firm_roles
        await supabase
            .from('user_firm_roles')
            .update({ status })
            .eq('user_id', id);

        // EXTRA TWEAK: If blocked, auto-logout (clear sessions)
        if (status === 'blocked') {
            await supabase
                .from('internal_sessions')
                .delete()
                .eq('user_id', id);

            // Send notification (though user is logged out, it's there if they try to re-enter)
            await supabase.from('notifications').insert({
                user_id: id,
                event_type: 'account_suspended',
                channel: 'in_app',
                payload: {
                    title: 'Account Suspended',
                    message: 'Your account has been suspended by an administrator.'
                }
            });
        }

        // Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: adminId || null,
            firm_id: firmId,
            action: status === 'blocked' ? 'staff_blocked' : 'staff_unblocked',
            target_id: id,
            metadata: { status }
        });

        res.status(200).json({
            success: true,
            message: `Staff member ${status === 'active' ? 'unblocked' : 'blocked'} successfully`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a staff member (Conditional)
 */
const deleteStaff = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firmId, adminId, adminRole } = req.body;

        // 1. Check Permissions: Case managers cannot delete staff
        if (adminRole !== 'admin_manager' && adminRole !== 'admin') {
            const err = new Error('Unauthorized: Only administrators can delete staff.');
            err.status = 403;
            throw err;
        }

        // 2. Check for active cases
        const { data: openMatters, error: matterError } = await supabase
            .from('matters')
            .select('id, title')
            .or(`assigned_associate.eq.${id},assigned_case_manager.eq.${id}`)
            .neq('status', 'closed');

        if (matterError) throw matterError;

        if (openMatters && openMatters.length > 0) {
            res.status(400).json({
                success: false,
                code: 'HAS_OPEN_MATTERS',
                message: `Cannot delete staff. This person is still handling ${openMatters.length} open case(s).`,
                matters: openMatters
            });
            return;
        }

        // 3. Clear sessions immediately
        await supabase
            .from('internal_sessions')
            .delete()
            .eq('user_id', id);

        // 4. Perform Deletion via RPC (Marks as deleted, removes firm role, revokes auth)
        const { data: result, error: deleteError } = await supabase.rpc('delete_staff_member_native', {
            p_user_id: id,
            p_firm_id: firmId
        });

        if (deleteError) throw deleteError;

        // 5. Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: adminId || null,
            firm_id: firmId,
            action: 'staff_deleted_permanently',
            target_id: id,
            metadata: { deleted_user_id: id }
        });

        res.status(200).json({
            success: true,
            message: 'Staff member deleted successfully',
            data: result
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Check staff status
 */
const getStaffStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('profiles')
            .select('status, last_login_at')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: {
                status: data.status,
                is_blocked: data.status === 'blocked',
                last_login: data.last_login_at,
                has_set_password: !!data.last_login_at // Simplified proxy for "set password"
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    inviteStaff,
    getStaffList,
    getInvitationList,
    renewInviteLink,
    updateStaffRole,
    toggleStaffStatus,
    getStaffStatus,
    deleteStaff
};
