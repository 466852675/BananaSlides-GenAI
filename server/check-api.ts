import axios from 'axios';

async function checkApi() {
    try {
        const res = await axios.get('http://localhost:1111/api/projects');
        const proj = res.data.find((x: any) => x.title === 'Renamed Project');
        if (proj) {
            console.log('Project ID:', proj.id);
            console.log('Project Status:', proj.status);
            console.log('Items Count:', proj.items.length);
            proj.items.forEach((i: any) => {
                console.log(`Slide ID: ${i.id}`);
                console.log(`  Title: ${i.title}`);
                console.log(`  Content: ${i.content}`);
                console.log(`  Status: ${i.status}`);
            });
        } else {
            console.log('Project "Renamed Project" not found');
        }
    } catch (e: any) {
        console.error('API Error:', e.message);
    }
}

checkApi();
