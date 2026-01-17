const axios = require('axios');

async function testPoll() {
    console.log('Testing /api/notifications/poll on port 1111...');
    try {
        const res = await axios.get('http://localhost:1111/api/notifications/poll');
        console.log('✅ Status:', res.status);
        console.log('✅ Data:', res.data);
    } catch (e) {
        console.error('❌ Request Failed');
        if (e.response) {
            console.error('   Status:', e.response.status);
            console.error('   Data:', e.response.data);
        } else {
            console.error('   Error:', e.message);
        }
    }
}

testPoll();
