
import axios from 'axios';

async function test() {
    try {
        // 1. List Projects to get an ID
        console.log('Listing projects...');
        const projectsRes = await axios.get('http://localhost:1111/api/projects');
        const projects = projectsRes.data;
        console.log(`Found ${projects.length} projects.`);
        
        if (projects.length === 0) {
            console.log('No projects found. Create one first.');
            return;
        }

        const pid = projects[0].id; // Use real ID
        console.log(`Testing snapshots for Project ID: ${pid}`);

        // 2. List Snapshots
        const start = Date.now();
        const snapRes = await axios.get(`http://localhost:1111/api/projects/${pid}/snapshots`);
        const duration = Date.now() - start;
        
        console.log(`Snapshots API took ${duration}ms`);
        console.log('Status:', snapRes.status);
        console.log('Data:', snapRes.data);
        
    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.response) {
             console.error('Response:', e.response.status, e.response.data);
        }
    }
}

test();
