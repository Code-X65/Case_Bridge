import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'c:/dev/Casebridge/casebridge-client/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('notifications').select('*').limit(1);
    console.log("Error:", error);
    console.log("Data:", data);
}

checkSchema();
