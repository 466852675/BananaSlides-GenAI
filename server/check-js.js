const axios = require('axios');

async function check() {
    try {
        const res = await axios.get('http://localhost:1111/api/projects');
        const renamed = res.data.find(p => p.title.includes('C3'));
        if (!renamed) return console.log('not found');

        const details = await axios.get(`http://localhost:1111/api/projects/${renamed.id}`);
        console.log('Full Data:', JSON.stringify(details.data, null, 2));
        details.data.items.sort((a, b) => a.index - b.index).forEach((item, i) => {
            console.log(`[Idx:${item.index}] Type:${item.pageType}`);
            console.log(`  Title: ${item.title}`);
            console.log(`  Content: ${item.content}\n`);
        });
    } catch (e) { console.error(e.message); }
}
check();
