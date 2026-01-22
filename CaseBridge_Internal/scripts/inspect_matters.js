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

async function inspectMatters() {
    console.log('--- Inspecting Matters Schema ---');
    // We can't use SQL directly as Anon, but we can try to fetch a row and see keys
    const { data, error } = await supabase.from('matters').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
        if (error.message.includes('column "firm_id" does not exist')) {
            console.log('❌ firm_id column is MISSING from matters table!');
        }
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No matters found to inspect. Table might be empty or RLS is blocking.');
    }
}

inspectMatters();
