const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data } = await supabase.from('audit_logs').select('*').limit(1);
  if (data && data[0]) {
    console.log('--- AUDIT LOGS COLUMNS ---');
    console.log(Object.keys(data[0]).join('\n'));
    console.log('----------------------------');
  }
}
test();
