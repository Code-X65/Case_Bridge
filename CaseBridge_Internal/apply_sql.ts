import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Use the ENV from the client portal as it has the Supabase URL/Key
dotenv.config({ path: 'c:/dev/Casebridge/casebridge-client/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log("Adding adverse_parties column to matters...");
    const { error: error1 } = await supabase.rpc('apply_sql', {
        sql_query: "ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS adverse_parties TEXT"
    });

    if (error1) {
        // Fallback: If apply_sql isn't an RPC, we might need another way.
        // But usually, I can just use the DB directly if I have access.
        // Let's try direct query if it allowed (sometimes via REST it's restricted)
        console.error("Direct SQL execution via RPC failed. Please run manually in the dashboard.");
        console.error("SQL: ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS adverse_parties TEXT");
        process.exit(1);
    }
}

// Actually, I don't have a reliable way to run arbitrary DDL SQL via @supabase/supabase-js 
// unless there's a specific RPC. Most production Supabase instances don't have 'apply_sql'.
// So I will just provide the SQL file and ask the user to run it.
console.log("Migration script created. Please run the SQL in your dashboard.");
