const API_BASE = 'http://localhost:5000/api/staff';

async function testStaffManagement() {
    console.log('🚀 Starting Staff Management API Tests...');

    try {
        // 1. Test Invite
        console.log('\n--- Testing: POST /api/staff/invite ---');
        const inviteResponse = await fetch(`${API_BASE}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test_staff_' + Date.now() + '@example.com',
                role: 'associate_lawyer',
                firstName: 'Test',
                lastName: 'Staff',
                firmId: 'a2a73b6b-d15e-4908-a8e3-85b16026e5bc' // Example firm ID from user request context
            })
        });
        const inviteData = await inviteResponse.json();
        console.log('Response:', JSON.stringify(inviteData, null, 2));

        if (inviteData.success) {
            console.log('✅ Invite successful');
        } else {
            console.error('❌ Invite failed');
        }

        // 2. Test Get Staff List
        console.log('\n--- Testing: GET /api/staff ---');
        const listResponse = await fetch(`${API_BASE}`);
        const listData = await listResponse.json();
        console.log('Staff count:', listData.data ? listData.data.length : 0);
        if (listData.success) console.log('✅ List Retrieval successful');

        // 3. Test Get Invitation List
        console.log('\n--- Testing: GET /api/staff/invitations ---');
        const invListResponse = await fetch(`${API_BASE}/invitations`);
        const invListData = await invListResponse.json();
        console.log('Invitation count:', invListData.data ? invListData.data.length : 0);
        
        let inviteId = null;
        if (invListData.success && invListData.data.length > 0) {
            inviteId = invListData.data[0].id;
            console.log('✅ Invitation List Retrieval successful');
        }

        // 4. Test Renew Invite
        if (inviteId) {
            console.log(`\n--- Testing: POST /api/staff/invitations/${inviteId}/renew ---`);
            const renewResponse = await fetch(`${API_BASE}/invitations/${inviteId}/renew`, {
                method: 'POST'
            });
            const renewData = await renewResponse.json();
            console.log('Response:', JSON.stringify(renewData, null, 2));
            if (renewData.success) console.log('✅ Renew successful');
        }

        // 5. Test Update Role & Toggle Status (using a staff member from the list if available)
        if (listData.success && listData.data.length > 0) {
            const staffId = listData.data[0].id;

            console.log(`\n--- Testing: PATCH /api/staff/${staffId}/role ---`);
            const roleResponse = await fetch(`${API_BASE}/${staffId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'case_manager' })
            });
            const roleData = await roleResponse.json();
            console.log('Response:', JSON.stringify(roleData, null, 2));
            if (roleData.success) console.log('✅ Role update successful');

            console.log(`\n--- Testing: PATCH /api/staff/${staffId}/status ---`);
            const statusResponse = await fetch(`${API_BASE}/${staffId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'blocked' })
            });
            const statusData = await statusResponse.json();
            console.log('Response:', JSON.stringify(statusData, null, 2));
            if (statusData.success) console.log('✅ Block successful');

            const statusCheckResponse = await fetch(`${API_BASE}/${staffId}/status`);
            const statusCheckData = await statusCheckResponse.json();
            console.log('Final Status:', statusCheckData.data.status);
            if (statusCheckData.data.is_blocked) console.log('✅ Block verification successful');

            // Reset back to active
            await fetch(`${API_BASE}/${staffId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' })
            });
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

testStaffManagement();
