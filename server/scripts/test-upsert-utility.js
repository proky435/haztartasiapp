const fetch = require('node-fetch');

async function testUpsertUtility() {
  try {
    // Test with a utility that doesn't exist
    const response = await fetch('https://192.168.0.19:3001/api/v1/utility-settings/6f21276c-07c9-42db-a5ac-606f40173b77/56158252-dd3c-4a42-9dc9-b51e8eef8f51', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'your-test-token-here'}`
      },
      body: JSON.stringify({
        base_fee: 1500,
        current_unit_price: 45.5,
        provider_name: 'Test Provider',
        is_enabled: true
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      console.error('❌ Request failed with status:', response.status);
    } else {
      console.log('✅ Request successful');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get token from localStorage simulation
console.log('🔍 Testing UPSERT functionality...');
console.log('Note: You need to provide a valid JWT token for this test');
testUpsertUtility();
