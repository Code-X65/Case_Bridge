import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
function loadEnv() {
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllMatters() {
    console.log('Fetching all matters from database (as Anon, usually returns 0 if RLS is on)...');

    // Note: To fetch ALL matters across ALL firms, RLS must be disabled for this script's user
    // or we'd need a service role key.

    const { data, error, count } = await supabase
        .from('matters')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching matters:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No matters returned. This is likely due to RLS enforcing firm isolation or empty database.');
        return;
    }

    console.log(`Successfully fetched ${count} matters.`);
    console.table(data.map(m => ({
        id: m.id.substring(0, 8) + '...',
        title: m.title,
        number: m.matter_number,
        status: m.status,
        firm: (m.firm_id?.substring(0, 8) || 'NONE') + '...',
        created: new Date(m.created_at).toLocaleDateString()
    })));
}

fetchAllMatters();
