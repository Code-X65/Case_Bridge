import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatters() {
    console.log('--- Checking Matters Table ---');
    const { data: matters, error } = await supabase
        .from('matters')
        .select('id, title, firm_id, client_id');

    if (error) {
        console.error('Error fetching matters:', error.message);
        return;
    }

    console.log(`Total Matters: ${matters.length}`);
    matters.forEach(m => {
        console.log(`Matter: ${m.title} | Firm ID: ${m.firm_id} | Client ID: ${m.client_id}`);
    });

    console.log('\n--- Checking Profiles Table (Clients) ---');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, role, internal_role, firm_id');

    if (pError) {
        console.error('Error fetching profiles:', pError.message);
    } else {
        console.log(`Total Profiles readable by script: ${profiles.length}`);
        profiles.forEach(p => {
            console.log(`Profile: ${p.email} | Role: ${p.role} | Internal Role: ${p.internal_role} | Firm ID: ${p.firm_id}`);
        });
    }
}

checkMatters();
