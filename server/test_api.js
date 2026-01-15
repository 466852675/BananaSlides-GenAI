const axios = require('axios');

const BASE_URL = 'http://localhost:1111/api';

async function runTest() {
    try {
        // 1. Get Projects
        console.log('1. Fetching projects...');
        const projectsRes = await axios.get(`${BASE_URL}/projects`);
        const projects = projectsRes.data;
        console.log(`   Found ${projects.length} projects.`);
        
        if (projects.length === 0) {
            console.log('   No projects found, skipping snapshot tests.');
            return;
        }

        const projectId = projects[0].id;
        console.log(`   Using Project ID: ${projectId}`);

        // 2. Get Snapshots
        console.log(`2. Fetching snapshots for project ${projectId}...`);
        const snapshotsRes = await axios.get(`${BASE_URL}/projects/${projectId}/snapshots`);
        const snapshots = snapshotsRes.data;
        console.log(`   Found ${snapshots.length} snapshots.`);

        if (snapshots.length === 0) {
            console.log('   No snapshots found, creating one...');
            // Optional: create snapshot logic if needed, but lets assume manual work for now or just skip
             console.log('   Skipping detail test.');
            return;
        }

        const snapshotId = snapshots[0].id;
        console.log(`   Using Snapshot ID: ${snapshotId}`);

        // 3. Get Snapshot Detail
        console.log(`3. Fetching snapshot detail for ${snapshotId}...`);
        try {
            const detailRes = await axios.get(`${BASE_URL}/snapshots/${snapshotId}`); // Using direct snapshot endpoint
            console.log('   SUCCESS: Snapshot detail fetched!');
            console.log('   Snapshot Version:', detailRes.data.version);
        } catch (e) {
            console.error('   FAILED: Fetching snapshot detail returned', e.response ? e.response.status : e.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

runTest();
