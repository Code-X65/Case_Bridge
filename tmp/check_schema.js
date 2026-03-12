const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'notifications' });
  
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema if possible
    // Supabase JS doesn't support raw SQL easily unless we use a function.
    // Let's just try to select from the column and see if it fails.
    const { error: colErr } = await supabase
      .from('notifications')
      .select('client_id')
      .limit(1);
    
    if (colErr) {
        console.log('Column client_id does not exist');
        console.log('Error:', colErr);
    } else {
        console.log('Column client_id exists');
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
