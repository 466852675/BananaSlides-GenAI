import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:1111/api'
});

async function check() {
    try {
        const projects = await api.get('/projects');
        const renamed = projects.data.find(p => p.title.includes('Renamed'));
        if (!renamed) {
            console.log('Project not found');
            return;
        }

        console.log('--- Project:', renamed.title, '---');
        console.log('ID:', renamed.id);

        const details = await api.get(`/projects/${renamed.id}`);
        console.log('Slides found:', details.data.items?.length);

        details.data.items.forEach((item, i) => {
            console.log(`Page ${i + 1}: [${item.title}]`);
            console.log(`Content: ${item.textContent}`);
            console.log('---');
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
