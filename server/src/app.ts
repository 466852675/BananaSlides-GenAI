import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import uploadRoutes from './routes/upload.routes';
import projectRoutes from './routes/project.routes';
import snapshotRoutes from './routes/snapshot.routes';
import mineruRoutes from './routes/mineru.routes';
import aiRoutes from './routes/ai.routes';
import notificationRoutes from './routes/notification.routes';
import templateRoutes from './routes/template.routes';
import favoriteRoutes from './routes/favorite.routes';
import settingRoutes from './routes/setting.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import pointsRoutes from './routes/points.routes';


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
// Diagnostic & Notification routes (High Priority)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.1', message: 'Backend is active' });
});

// Auth routes MUST come first (before any authenticated routes)
app.use('/api/auth', authRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
// Moving snapshots before projects to avoid route shadowing
app.use('/api', snapshotRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/doc-parser', mineruRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/points', pointsRoutes);

import { SettingService } from './services/setting.service';



// Watch for .env changes (Hot Reload)
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log(`[App] Watching for .env changes at: ${envPath}`);
    let fsWait: NodeJS.Timeout | null = null;
    fs.watch(envPath, (event: string, filename: string | Buffer | null) => {
        if (filename && event === 'change') {
            if (fsWait) return;
            fsWait = setTimeout(async () => {
                fsWait = null;
                console.log(`[App] Detected change in .env, reloading...`);
                await SettingService.reloadEnv();
            }, 500); // 500ms Debounce (increased to reduce excessive reloads)
        }
    });
}

const server = app.listen(port, async () => {
    console.log(`BananaSlides Server running at http://localhost:${port}`);
    console.log(`Uploads Directory: ${uploadDir}`);

    // Sync Env Settings to DB on Startup
    try {
        await SettingService.syncEnvToDatabase();
        console.log('[App] Settings synchronized from .env');
    } catch (err) {
        console.error('[App] Failed to sync settings from .env:', err);
    }

    // 🆕 Bootstrap: 初始化管理员和种子数据
    try {
        const { runBootstrap } = await import('./bootstrap/admin.bootstrap');
        await runBootstrap();
    } catch (err) {
        console.error('[App] Bootstrap failed:', err);
    }


    console.log(`API Endpoints:
    - POST /api/upload
    - GET /api/projects
    - POST /api/doc-parser/parse
    - /api/projects/:id/snapshots`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[App] Server encountered an error:', err);
    // 端口占用时立即退出，避免继续执行初始化逻辑
    if (err.code === 'EADDRINUSE') {
        console.error(`[App] ❌ 端口 ${port} 已被占用！请先关闭占用该端口的程序，或更改 .env 中的 PORT 配置。`);
        console.error(`[App] 提示：运行 'taskkill /F /IM node.exe' 可杀死所有 Node 进程`);
        process.exit(1);
    }
});


// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('[App] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[App] Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
