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

async function checkRLS() {
    // We can't see pg_tables as Anon, but we can infer.
    // Actually, we can run a query to check if we can see rows without Auth.
    const { data, count, error } = await supabase.from('matters').select('*', { count: 'exact' });
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Visible Matters as Anon: ${count}`);
}

checkRLS();
