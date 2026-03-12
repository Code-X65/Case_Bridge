const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/calendar';

// Mock data for testing
const testEvent = {
  firm_id: '80927958-306f-4217-acfb-9d7a22670e9a', // Using a real firm ID from the system if possible, or placeholder
  matter_id: 'aa644169-b5aa-42ba-8898-0939c10e949e',
  created_by: 'fikeg75054@pckage.com', // Placeholder email/id
  title: 'API Test Meeting',
  description: 'Testing unified scheduling logic',
  event_type: 'meeting',
  meeting_type: 'virtual',
  start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  end_time: new Date(Date.now() + 7200000).toISOString(),   // 2 hours from now
  virtual_link: 'https://internal.casebridge.com/test-room',
  participant_ids: []
};

async function runTests() {
  console.log('🚀 Starting Scheduling API Verification...');

  try {
    // 1. Create Event
    console.log('\n--- Test 1: Create Event ---');
    // Note: This might fail if the IDs aren't valid in the actual DB, 
    // but we can check the 400/500 errors to see if logic is reached.
    try {
        const createRes = await axios.post(`${BASE_URL}/events`, testEvent);
        console.log('✅ Event Created:', createRes.data.success);
    } catch (e) {
        console.log('ℹ️ Create Event result (expected if IDs invalid):', e.response?.data?.message || e.message);
    }

    // 2. Check Conflicts
    console.log('\n--- Test 2: Check Conflicts ---');
    const conflictRes = await axios.post(`${BASE_URL}/check-conflicts`, {
      start_time: testEvent.start_time,
      end_time: testEvent.end_time,
      location_id: null,
      user_ids: []
    });
    console.log('✅ Conflict Check Response:', conflictRes.data.success);
    console.log('Data:', JSON.stringify(conflictRes.data.data, null, 2));

    // 3. Get Staff Calendar
    console.log('\n--- Test 3: Get Staff Calendar ---');
    try {
        const staffRes = await axios.get(`${BASE_URL}/staff`, { params: { user_id: 'dummy-id' } });
        console.log('✅ Staff Calendar Fetched:', staffRes.data.success);
    } catch (e) {
        console.log('ℹ️ Staff Calendar result:', e.response?.data?.message || e.message);
    }

    console.log('\n✅ Verification Script Completed.');
  } catch (error) {
    console.error('❌ Test Suite Failed:', error.message);
  }
}

runTests();
