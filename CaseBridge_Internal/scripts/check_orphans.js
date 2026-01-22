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

async function checkOrphanMatters() {
    const { data: matters, error: mError } = await supabase.from('matters').select('id, client_id, title');
    if (mError) {
        console.error('Error:', mError.message);
        return;
    }

    for (const m of matters) {
        const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', m.client_id).single();
        if (pError) {
            console.log(`Matter: ${m.title} | Client ID: ${m.client_id} | PROFILE ERROR: ${pError.message}`);
        } else {
            console.log(`Matter: ${m.title} | Client: ${profile.email}`);
        }
    }
}

checkOrphanMatters();
