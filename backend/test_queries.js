const { supabase } = require('./src/config/supabase');

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
      .eq('client_id', 'af9d66ff-7140-4c8b-9d68-0ab1fb88d766')
      .limit(1);
    if (error) {
      console.error('getMatters Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('getMatters Success:', (data && data.length > 0) ? 'Data found' : 'No data');
      if (data && data[0]) console.log('Sample matter:', JSON.stringify(data[0], null, 2));
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
      console.error('matter_updates join Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('matter_updates join Success');
    }
  } catch (err) {
    console.error('matter_updates join Crash:', err);
  }

  console.log('\n--- Checking Table Existence ---');
  const tables = [
    'profiles', 'external_users', 'client_profiles', 
    'notifications', 'client_notifications', 
    'matter_messages', 'matter_messages_view',
    'calendar_events', 'calendar_participants', 'firm_locations'
  ];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table}: ERROR (${error.message})`);
      } else {
        console.log(`Table ${table}: EXISTS (${data.length} rows sample)`);
        if (data.length > 0) {
          console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`Table ${table}: CRASHED (${err.message})`);
    }
  }
}

testQueries();
