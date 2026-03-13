const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkInvitations() {
    console.log('Fetching data...');
    try {
        const [invitations, profiles, authUsers] = await Promise.all([
            supabase.from('invitations').select('*'),
            supabase.from('profiles').select('*'),
            supabase.auth.admin.listUsers()
        ]);

        if (invitations.error) console.error('Inv Error:', invitations.error);
        else {
            console.log('\n--- Invitations ---');
            console.table(invitations.data.map(i => ({ email: i.email, status: i.status, created: i.created_at })));
        }

        if (profiles.error) console.error('Prof Error:', profiles.error);
        else {
            console.log('\n--- Profiles ---');
            console.table(profiles.data.map(p => ({ email: p.email, role: p.role, status: p.status })));
        }

        if (authUsers.error) console.error('Auth Error:', authUsers.error);
        else {
            console.log('\n--- Auth Users ---');
            console.table(authUsers.data.users.map(u => ({ 
                email: u.email, 
                confirmed: !!u.email_confirmed_at,
                firm_id: u.user_metadata?.firm_id,
                role: u.user_metadata?.role
            })));
        }
    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

checkInvitations();
