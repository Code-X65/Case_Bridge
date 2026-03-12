const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'notifications' });
  if (error) {
    console.log('RPC failed:', error.message);
    // Try querying a system table if allowed
    const { data: cols, error: colErr} = await supabase.from('notifications').select('*').limit(0);
    if (colErr) {
        console.log('Query failed:', colErr.message);
    } else {
        console.log('Available columns from select:', Object.keys(cols[0] || {}).length ? Object.keys(cols[0]) : 'None (empty data)');
    }
  } else {
    console.log('Columns:', data);
  }
}
run();
