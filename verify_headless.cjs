
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:1111/api';

async function runTests() {
    console.log('🚀 Starting Backend Logic Verification (Headless)...');
    let testProjectId = null;

    try {
        // --- Test 1: Project Creation & Persistence Logic ---
        console.log('\n[TEST 1] Creating Project & Checking Persistence Logic...');
        const createRes = await axios.post(`${BASE_URL}/projects`, {
            title: 'Verify Fixes Headless',
            globalConfig: JSON.stringify({ styleName: 'Modern' }),
            status: 'idle'
        });
        testProjectId = createRes.data.id;
        console.log(`✅ Project Created: ${testProjectId}`);

        // Verify we can fetch it back (Routing/Persistence basics)
        const fetchRes = await axios.get(`${BASE_URL}/projects/${testProjectId}`);
        if (fetchRes.data.id === testProjectId) {
            console.log('✅ Project Persistence Verified (Backend Level).');
        } else {
            throw new Error('Project persistence failed - ID mismatch.');
        }

        // --- Test 2: Upload C3 File (Simulating C3 Fix) ---
        console.log('\n[TEST 2] Verifying C3 File Parsing Fix...');
        // Create a dummy text file
        const testFilePath = path.join(__dirname, 'test_c3.txt');
        fs.writeFileSync(testFilePath, 'BananaSlides C3 Test Content');

        // Check if backend parser route works directly
        // Note: The frontend uses axios to call /api/doc-parser/parse with FormData
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath));

        const uploadRes = await axios.post(`${BASE_URL}/doc-parser/parse`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // The Fix was in frontend (geminiService.ts) where it was accessing response.data.data
        // We need to verify what the backend *actually* returns to confirm the frontend fix is correct.
        console.log('✅ Backend Parser Response Received.');
        console.log('   Response Data Structure keys:', Object.keys(uploadRes.data));

        // If backend returns { content: "...", ... } and NOT { data: { content: ... } }
        // then frontend code `response.data` is correct, and `response.data.data` was wrong.
        if (uploadRes.data.content) {
            console.log('   Structure Check: root has "content" property.');
            console.log('✅ CONCLUSION: Backend returns flat object. Frontend fix (removing .data) is CORRECT.');
        } else if (uploadRes.data.data && uploadRes.data.data.content) {
            console.log('   Structure Check: root has "data" property containing content.');
            console.error('❌ CONCLUSION: Backend returns nested object. Frontend fix might be WRONG (or Axios interceptor is confusing things).');
        } else {
            console.warn('⚠️ Unknown response structure:', uploadRes.data);
        }

        // Cleanup
        fs.unlinkSync(testFilePath);

    } catch (e) {
        console.error('❌ Test Failed:', e.message);
        if (e.response) {
            console.error('   Status:', e.response.status);
            console.error('   Data:', e.response.data);
        }
    } finally {
        if (testProjectId) {
            console.log('\n[Cleanup] Deleting test project...');
            await axios.delete(`${BASE_URL}/projects/${testProjectId}`).catch(() => { });
        }
    }
}

runTests();
