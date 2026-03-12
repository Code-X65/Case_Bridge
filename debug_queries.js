const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQueries() {
  console.log('--- Testing getMatters query ---');
  try {
    const { data, error } = await supabase
      .from('matters')
      .select(`
        *,
        assignee:assigned_associate ( id, full_name, email ),
        case_manager:assigned_case_manager ( id, full_name ),
        client:client_id ( id, first_name, last_name, email, phone )
      `)
      .limit(1);
    if (error) {
      console.error('getMatters Error:', error);
    } else {
      console.log('getMatters Success:', data.length > 0 ? 'Data found' : 'No data');
    }
  } catch (err) {
    console.error('getMatters Crash:', err);
  }

  console.log('\n--- Testing getMatterDocuments (matter_updates join) ---');
  try {
    const { data, error } = await supabase
      .from('matter_updates')
      .select(`
        id,
        report_documents (
          client_visible,
          document:document_id ( * )
        )
      `)
      .limit(1);
    if (error) {
      console.error('matter_updates join Error:', error);
    } else {
      console.log('matter_updates join Success');
    }
  } catch (err) {
    console.error('matter_updates join Crash:', err);
  }

  console.log('\n--- Testing getMatterDocuments (case_report_documents join) ---');
  try {
    const { data, error } = await supabase
      .from('case_report_documents')
      .select(`
        document:document_id ( * )
      `)
      .limit(1);
    if (error) {
      console.error('case_report_documents join Error:', error);
    } else {
      console.log('case_report_documents join Success');
    }
  } catch (err) {
    console.error('case_report_documents join Crash:', err);
  }
}

testQueries();
