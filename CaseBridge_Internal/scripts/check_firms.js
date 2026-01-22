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

async function checkFirms() {
    console.log('--- Checking Firms ---');
    const { data, error, count } = await supabase.from('firms').select('*', { count: 'exact' });
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Total Firms: ${count}`);
    if (data) {
        data.forEach(f => console.log(`Firm: ${f.name} | ID: ${f.id}`));
    }
}

checkFirms();
