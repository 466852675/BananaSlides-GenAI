import axios from 'axios';

const API_URL = 'http://127.0.0.1:1111/api'; // Direct to backend

async function main() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            identity: 'admin@bananaslides.com',
            password: 'Test123456!'
        });

        if (!loginRes.data.success) {
            throw new Error(`Login failed: ${loginRes.data.error?.message}`);
        }

        const token = loginRes.data.data.token;
        console.log('Login successful.');

        // 2. Get Stats
        console.log('Fetching Admin Stats...');
        const statsRes = await axios.get(`${API_URL}/admin/system/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!statsRes.data.success) {
            throw new Error(`Stats fetch failed: ${statsRes.data.error?.message}`);
        }

        console.log('Stats Response:', JSON.stringify(statsRes.data.data, null, 2));

        // 3. Validation
        const stats = statsRes.data.data;
        // Check structure based on likely implementation (users.today, etc.)
        // We will output the checking logic results
        console.log('Checking "today" fields...');

        // Adjust these checks based on actual expected response structure
        // Assuming structure involves something like { users: { total: 10, today: 1 }, ... }
        // or flat structure? Let's check the output.

    } catch (error: any) {
        console.error('Error Status:', error.response?.status);
        console.error('Error Data:', JSON.stringify(error.response?.data || {}, null, 2));
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

main();
