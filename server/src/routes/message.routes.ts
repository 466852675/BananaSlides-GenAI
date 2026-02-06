import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
    createMessage,
    getMessages,
    getMessageById,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    getUnreadCount,
    getUnreadCountByType,
} from '../services/message.service';

const router = Router();

router.use(authenticate);

// 获取用户消息列表
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as any;
        const isRead = req.query.isRead === 'true' ? true :
                       req.query.isRead === 'false' ? false : undefined;

        const result = await getMessages(
            { userId, type, isRead },
            { page, limit }
        );

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('[MessageRoute] 获取消息列表失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '获取消息列表失败',
        });
    }
});

// 获取未读消息数量
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user!.id;

        const [total, byType] = await Promise.all([
            getUnreadCount(userId),
            getUnreadCountByType(userId),
        ]);

        res.json({
            success: true,
            data: {
                total,
                byType,
            },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 获取未读数量失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '获取未读数量失败',
        });
    }
});

// 获取单条消息详情
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id;

        const message = await getMessageById(messageId, userId);

        if (!message) {
            return res.status(404).json({
                success: false,
                code: 'MESSAGE_NOT_FOUND',
                message: '消息不存在',
            });
        }

        // 自动标记为已读
        if (!message.isRead) {
            await markAsRead(messageId, userId);
        }

        res.json({
            success: true,
            data: message,
        });
    } catch (error: any) {
        console.error('[MessageRoute] 获取消息详情失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '获取消息详情失败',
        });
    }
});

// 标记消息为已读
router.post('/:id/read', async (req, res) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id;

        const success = await markAsRead(messageId, userId);

        if (!success) {
            return res.status(404).json({
                success: false,
                code: 'MESSAGE_NOT_FOUND',
                message: '消息不存在',
            });
        }

        res.json({
            success: true,
            message: '已标记为已读',
        });
    } catch (error: any) {
        console.error('[MessageRoute] 标记已读失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '标记已读失败',
        });
    }
});

// 标记所有消息为已读
router.post('/read-all', async (req, res) => {
    try {
        const userId = req.user!.id;

        const count = await markAllAsRead(userId);

        res.json({
            success: true,
            message: `已将 ${count} 条消息标记为已读`,
            data: { count },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 全部标记已读失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '全部标记已读失败',
        });
    }
});

// 删除消息
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id;

        const success = await deleteMessage(messageId, userId);

        if (!success) {
            return res.status(404).json({
                success: false,
                code: 'MESSAGE_NOT_FOUND',
                message: '消息不存在',
            });
        }

        res.json({
            success: true,
            message: '消息已删除',
        });
    } catch (error: any) {
        console.error('[MessageRoute] 删除消息失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '删除消息失败',
        });
    }
});

export default router;
