import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import uploadRoutes from './routes/upload.routes';
import projectRoutes from './routes/project.routes';
import snapshotRoutes from './routes/snapshot.routes';
import mineruRoutes from './routes/mineru.routes';
import aiRoutes from './routes/ai.routes';

// Load env from server directory
dotenv.config();

const app = express();
const port = process.env.PORT || 1111;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static Uploads
// Ensure we use the absolute path to 'uploads' folder in server root
const uploadDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/doc-parser', mineruRoutes);
app.use('/api/ai', aiRoutes);
// Snapshot routes (e.g. /projects/:id/snapshots)
app.use('/api', snapshotRoutes);

app.listen(port, () => {
    console.log(`BananaSlides Server running at http://localhost:${port}`);
    console.log(`Uploads Directory: ${uploadDir}`);
    console.log(`API Endpoints:
    - POST /api/upload
    - GET /api/projects
    - POST /api/doc-parser/parse
    - /api/projects/:id/snapshots`);
});

export default app;
