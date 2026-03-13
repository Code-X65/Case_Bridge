const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function healData() {
    console.log('🚀 Starting Data Healing Process...');

    try {
        // 1. Heal Invitation Status
        console.log('\n--- Healing Invitation Status ---');
        const [invResp, profResp] = await Promise.all([
            supabase.from('invitations').select('*').eq('status', 'pending'),
            supabase.from('profiles').select('*')
        ]);

        if (invResp.error) throw invResp.error;
        if (profResp.error) throw profResp.error;

        const pendingInvites = invResp.data;
        const profiles = profResp.data;

        for (const invite of pendingInvites) {
            const match = profiles.find(p => p.email.toLowerCase() === invite.email.toLowerCase());
            if (match) {
                console.log(`Matching ${invite.email} to profile ${match.id}...`);
                const { error } = await supabase
                    .from('invitations')
                    .update({
                        status: 'accepted',
                        user_id: match.id,
                        accepted_at: match.created_at || new Date().toISOString()
                    })
                    .eq('id', invite.id);
                
                if (error) console.error(`Failed to update ${invite.email}:`, error.message);
                else console.log(`✅ ${invite.email} marked as accepted.`);
            }
        }

        // 2. Heal Admin Metadata
        console.log('\n--- Healing Admin Metadata ---');
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: roles, error: roleError } = await supabase.from('user_firm_roles').select('*');
        if (roleError) throw roleError;

        for (const user of users) {
            if (!user.user_metadata?.firm_id) {
                const roleMatch = roles.find(r => r.user_id === user.id);
                if (roleMatch) {
                    console.log(`Updating metadata for ${user.email} with firm_id ${roleMatch.firm_id}...`);
                    const { error } = await supabase.auth.admin.updateUserById(user.id, {
                        user_metadata: {
                            ...user.user_metadata,
                            firm_id: roleMatch.firm_id,
                            role: roleMatch.role
                        }
                    });

                    if (error) console.error(`Failed to update ${user.email}:`, error.message);
                    else console.log(`✅ ${user.email} metadata updated.`);
                }
            }
        }

        console.log('\n🏁 Healing Process Completed.');

    } catch (error) {
        console.error('❌ Healing failed:', error.message);
    }
}

healData();
