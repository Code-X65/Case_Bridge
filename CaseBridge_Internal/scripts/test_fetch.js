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

async function testFetch() {
    const firmId = '11111111-1111-1111-1111-111111111111'; // Dummy or real
    console.log('Testing fetch with or filter...');
    const { data, count, error } = await supabase
        .from('matters')
        .select('*', { count: 'exact' })
        .or(`firm_id.eq.${firmId},firm_id.is.null`);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Count: ${count}`);
    if (data) {
        data.forEach(m => console.log(`Matter: ${m.title} | Firm: ${m.firm_id}`));
    }
}

testFetch();
