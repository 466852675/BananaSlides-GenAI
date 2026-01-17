const axios = require('axios');

async function check() {
    try {
        console.log('--- Checking Favorites ---');
        // Assuming there is an API for favorites. If not, we might need to check DB directly or infer from user profile.
        // Let's try to list templates which might include custom ones.

        const templatesRes = await axios.get('http://localhost:1111/api/templates');
        const customTemplates = templatesRes.data.filter(t => t.isCustom);
        console.log(`Found ${customTemplates.length} Custom Templates`);
        customTemplates.forEach(t => console.log(`  [Id:${t.id}] Name: ${t.name}, Created: ${t.createdAt}`));

        console.log('\n--- Checking Project Style Config ---');
        // Check B6 project style map
        const projectsRes = await axios.get('http://localhost:1111/api/projects');
        const b6 = projectsRes.data.find(p => p.title.includes('B6 Detailed'));
        if (b6) {
            const details = await axios.get(`http://localhost:1111/api/projects/${b6.id}`);
            console.log(`Project: ${b6.title}`);
            console.log(`GlobalConfig:`, JSON.stringify(details.data.globalConfig, null, 2));
            console.log(`StyleMap Keys:`, Object.keys(details.data.styleMap || {}));
        } else {
            console.log('B6 Project not found');
        }

    } catch (e) {
        console.error(e.message);
        // Try DB direct if API fails (Prisma) - Just logging error for now
        if (e.response) console.log(e.response.status, e.response.data);
    }
}
check();
