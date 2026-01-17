const { chromium } = require('playwright');
const axios = require('axios');

(async () => {
  console.log('🚀 Starting Persistence & History UAT Tests...');
  
  const BASE_URL = 'http://localhost:1111/api';
  let testProjectId = null;

  // --- 1. Create a Test Project ---
  console.log('\n[Setup] Creating a fresh project for persistence test...');
  try {
    const res = await axios.post(`${BASE_URL}/projects`, {
        title: 'Persistence Integration Test',
        globalConfig: JSON.stringify({ styleName: 'Modern', aspectRatio: '16:9' }),
        status: 'idle'
    });
    testProjectId = res.data.id;
    console.log(`✅ Project Created: ${testProjectId}`);
  } catch (e) {
    console.error('❌ Setup failed:', e.message);
    process.exit(1);
  }

  // --- 2. Test PER-002: Slide Persistence (syncSlides) ---
  console.log('\n[Test PER-002] Verifying Slide Synchronization');
  try {
    const testSlides = [
        {
            id: 'slide-1', 
            index: 0, 
            pageType: 'cover', 
            contentType: 'text', 
            title: 'Persistence is Key', 
            textContent: 'This content must survive a restart.' 
        }
    ];

    console.log('   Sending sync request...');
    await axios.patch(`${BASE_URL}/projects/${testProjectId}/slides`, {
        slides: testSlides
    });

    // Fetch back to verify
    const verifyRes = await axios.get(`${BASE_URL}/projects/${testProjectId}`);
    if (verifyRes.data.items && verifyRes.data.items.length === 1) {
        const slide = verifyRes.data.items[0];
        if (slide.title === 'Persistence is Key') {
            console.log('✅ Slide data successfully synchronized and verified.');
        } else {
            console.error(`❌ Data Mismatch! Got: ${slide.title}`);
        }
    } else {
        console.error('❌ Slide count mismatch after sync.');
    }
  } catch (e) {
    console.error('❌ PER-002 failed:', e.response?.data || e.message);
  }

  // --- 3. Test HIS-001: Snapshot Creation ---
  console.log('\n[Test HIS-001] Verifying Snapshot Generation');
  try {
    // Note: The controller expects { projectData, settings }
    const snapshotPayload = {
        projectData: {
            id: testProjectId,
            title: 'Persistence Integration Test',
            items: [{ id: 'slide-1', title: 'Modified for Snapshot' }],
            globalConfig: { styleName: 'Modern' }
        },
        settings: { ai: { provider: 'Gemini' } } // Required for AI summary
    };

    const res = await axios.post(`${BASE_URL}/projects/${testProjectId}/snapshots`, snapshotPayload);
    
    if (res.data.id && res.data.version >= 1) {
        console.log(`✅ Snapshot Created! Version: ${res.data.version}, ID: ${res.data.id}`);
        console.log(`   Initial Summary: "${res.data.summary}"`);
        
        // Wait 2 seconds for AI summary generation (async)
        console.log('   Waiting for AI to generate summary...');
        await new Promise(r => setTimeout(r, 3000));
        
        const verifySnap = await axios.get(`${BASE_URL}/snapshots/${res.data.id}`);
        console.log(`✅ Final AI Summary: "${verifySnap.data.summary}"`);
    } else {
        console.error('❌ Snapshot response invalid.');
    }
  } catch (e) {
    console.error('❌ HIS-001 failed:', e.response?.data || e.message);
  }

  // --- Cleanup ---
  console.log('\n[Cleanup] Removing test project...');
  await axios.delete(`${BASE_URL}/projects/${testProjectId}`);
  console.log('✅ Cleaned up.');

  console.log('\n✨ Persistence & History Tests Complete.');
})();
