const axios = require('axios');

async function check() {
    try {
        const res = await axios.get('http://localhost:1111/api/projects');
        const project = res.data.find(p => p.title.includes('B6 Detailed'));
        if (!project) return console.log('B6 project not found');

        console.log(`Checking snapshots for: ${project.title} (${project.id})`);
        const snapRes = await axios.get(`http://localhost:1111/api/projects/${project.id}/snapshots`);

        console.log(`Found ${snapRes.data.length} snapshots`);
        snapRes.data.forEach((s, i) => {
            console.log(`[${i}] ID: ${s.id.substring(0, 8)}... Note: ${s.note || 'N/A'} Time: ${s.createdAt}`);
        });
    } catch (e) {
        console.error(e.message);
        if (e.response) console.error(e.response.data);
    }
}
check();
