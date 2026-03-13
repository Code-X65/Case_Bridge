const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFirmData() {
    console.log('Fetching detailed firm data...');
    try {
        const [roles, firms] = await Promise.all([
            supabase.from('user_firm_roles').select('*'),
            supabase.from('firms').select('*')
        ]);

        console.log('\n--- Firms ---');
        console.table(firms.data.map(f => ({ id: f.id, name: f.name })));

        console.log('\n--- User Firm Roles ---');
        console.table(roles.data.map(r => ({ user_id: r.user_id, firm_id: r.firm_id, role: r.role, status: r.status })));

    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

checkFirmData();
