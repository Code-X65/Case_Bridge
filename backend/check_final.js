const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFinalState() {
    console.log('--- Final Database State Check ---');
    try {
        const firmId = '6e4d8ef7-2c36-4689-8541-5e01e8f57692';
        
        const [invitations, profiles, roles] = await Promise.all([
            supabase.from('invitations').select('*').eq('firm_id', firmId),
            supabase.from('profiles').select('*'),
            supabase.from('user_firm_roles').select('*').eq('firm_id', firmId)
        ]);

        console.log('\n--- Invitations (Firm: ' + firmId + ') ---');
        console.table(invitations.data.map(i => ({ email: i.email, status: i.status, user_id: i.user_id })));

        console.log('\n--- Profiles ---');
        console.table(profiles.data.map(p => ({ id: p.id, email: p.email, status: p.status })));

        console.log('\n--- User Firm Roles (Firm: ' + firmId + ') ---');
        console.table(roles.data.map(r => ({ user_id: r.user_id, role: r.role, status: r.status })));

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkFinalState();
