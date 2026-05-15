import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { disconnectDatabase } from './db';
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
import orderRoutes from './routes/order.routes';
import refundRoutes from './routes/refund.routes';
import webhookRoutes from './routes/webhook.routes';
import messageRoutes from './routes/message.routes';
import productRoutes from './routes/product.routes';
import growthRoutes from './routes/growth.routes';
import leadRoutes from './routes/lead.routes';
import agentRoutes from './routes/agent.routes';
import resourceRoutes from './routes/resource.routes';
import trashRoutes from './routes/trash.routes';
import exportRoutes from './routes/export.routes';
import { commercialGuard } from './middleware/commercialGuard';
import { SettingService } from './services/setting.service';
import { websocketService } from './services/websocket.service';
import { startScheduledJobs } from './jobs/cron';

// Import optimized limiters from middleware
import {
    generalLimiter as optimizedGeneralLimiter,
    adminLimiter,
    aiLimiter as optimizedAiLimiter,
    uploadLimiter as optimizedUploadLimiter
} from './middleware/rateLimitMiddleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 1111;

// 信任反向代理（Nginx/Caddy），使 req.ip 正确获取 x-forwarded-for 中的真实客户端 IP
app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:1000',
    'http://localhost:5173',
    'http://127.0.0.1:1000',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 开发环境白名单 - 本地开发跳过限流
const skipLimiterForDev = (req: express.Request) => {
    const origin = req.headers.origin || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isDevEnv = process.env.NODE_ENV !== 'production';
    return isLocalhost || isDevEnv;
};

// 全局限流配置（更宽松）
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    skip: skipLimiterForDev,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 登录限流配置（开发友好）
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: skipLimiterForDev,
    skipSuccessfulRequests: true,
    message: { error: '登录尝试次数过多，请15分钟后再试' },
});

// 通知轮询专用限流
const pollLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    skip: skipLimiterForDev,
    message: { error: '轮询请求过于频繁' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 应用限流 - 策略：后台接口提额，轮询接口提额，通用接口兜底
app.use('/api/admin', adminLimiter); // 管理员页面提额
app.use('/api/notifications/poll', pollLimiter); // 通知轮询提额
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', optimizedAiLimiter); // AI 专用限流
app.use('/api/upload', optimizedUploadLimiter); // 上传专用限流
app.use('/api/', optimizedGeneralLimiter || generalLimiter); // 其他所有API路由

app.use(express.json({ limit: '50mb' }));

// Static Uploads
const uploadDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.1', message: 'Backend is active' });
});

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
// Agent 路由必须放在 /api (snapshotRoutes) 之前，因为 snapshotRoutes 有全局 authenticate 中间件
// 会拦截所有 /api/* 请求，导致 SSE 端点（/api/agent/sessions/:id/progress）无法到达
app.use('/api/agent', agentRoutes);
app.use('/api', snapshotRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/doc-parser', mineruRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/points', commercialGuard('points'), pointsRoutes);
app.use('/api/orders', commercialGuard('orders'), orderRoutes);
app.use('/api/refunds', commercialGuard('refunds'), refundRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/products', commercialGuard('purchase'), productRoutes);
app.use('/api/leads', commercialGuard('leads'), leadRoutes);
app.use('/api/growth', commercialGuard('growth'), growthRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/export', exportRoutes);

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
            }, 500);
        }
    });
}

const server = app.listen(port, async () => {
    console.log(`YH-AI PPT Server running at http://localhost:${port}`);
    console.log(`Uploads Directory: ${uploadDir}`);

    try {
        await SettingService.syncEnvToDatabase();
        console.log('[App] Settings synchronized from .env');
    } catch (err) {
        console.error('[App] Failed to sync settings from .env:', err);
    }

    try {
        const { runBootstrap } = await import('./bootstrap/admin.bootstrap');
        await runBootstrap();
    } catch (err) {
        console.error('[App] Bootstrap failed:', err);
    }

    // Initialize WebSocket service
    websocketService.init(server);
    console.log('[App] WebSocket service initialized at /ws');

    // Start scheduled jobs (resource cleanup, etc.)
    startScheduledJobs();
    console.log('[App] Scheduled jobs started');

    console.log(`API Endpoints:
    - POST /api/upload
    - GET /api/projects
    - POST /api/doc-parser/parse
    - /api/projects/:id/snapshots`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[App] Server encountered an error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`[App] ❌ 端口 ${port} 已被占用！请先关闭占用该端口的程序，或更改 .env 中的 PORT 配置。`);
        process.exit(1);
    }
});

async function gracefulShutdown(exitCode: number) {
    console.log('[App] Graceful shutdown initiated...');

    // Close WebSocket connections
    websocketService.close();

    server.close(() => {
        console.log('[App] HTTP server closed');
    });
    try {
        await disconnectDatabase();
        console.log('[App] Database connections closed');
    } catch (err) {
        console.error('[App] Error during database disconnect:', err);
    }
    setTimeout(() => {
        console.error('[App] Forced exit after timeout');
        process.exit(exitCode);
    }, 10000).unref();
}

process.on('uncaughtException', (err) => {
    console.error('[App] Uncaught Exception:', err);
    gracefulShutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[App] Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown(1);
});

process.on('SIGTERM', () => {
    console.log('[App] SIGTERM received');
    gracefulShutdown(0);
});

process.on('SIGINT', () => {
    console.log('[App] SIGINT received');
    gracefulShutdown(0);
});

export default app;
