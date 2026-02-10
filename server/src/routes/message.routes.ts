import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
    createMessage,
    getMessages,
    getMessageById,
    markAsRead,
    markAllAsRead,
    markMessagesAsRead,
    deleteMessage,
    deleteMessages,
    getUnreadCount,
    getUnreadCountByType,
    markMessageAsHandled,
    archiveMessage,
    archiveMessages,
    cleanupExpiredMessages,
} from '../services/message.service';
import {
    getMessageSettings,
    updateMessageSettings,
} from '../services/message-settings.service';

const router = Router();

router.use(authenticate);

// 获取用户消息列表
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as any;
        const bizType = req.query.bizType as string;
        const excludeBizType = req.query.excludeBizType as string;
        const keyword = req.query.keyword as string;
        const isRead = req.query.isRead === 'true' ? true :
            req.query.isRead === 'false' ? false : undefined;

        const result = await getMessages(
            { userId, type, isRead, bizType, excludeBizType, keyword },
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

// 获取用户消息设置
router.get('/settings', async (req, res) => {
    try {
        const userId = req.user!.id;
        const settings = await getMessageSettings(userId);
        res.json({ success: true, data: settings });
    } catch (error: any) {
        console.error('[MessageRoute] 获取设置失败:', error);
        res.status(500).json({ success: false, message: '获取设置失败' });
    }
});

// 更新用户消息设置
router.put('/settings', async (req, res) => {
    try {
        const userId = req.user!.id;
        const updated = await updateMessageSettings(userId, req.body);
        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('[MessageRoute] 更新设置失败:', error);
        res.status(500).json({ success: false, message: '更新设置失败' });
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

// 批量删除消息
router.post('/batch-delete', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PARAMS',
                message: '请提供要删除的消息ID列表',
            });
        }

        const count = await deleteMessages(ids, userId);

        res.json({
            success: true,
            message: `已删除 ${count} 条消息`,
            data: { count },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 批量删除消息失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '批量删除消息失败',
        });
    }
});

// 批量标记消息为已读
router.post('/batch-read', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PARAMS',
                message: '请提供要标记已读的消息ID列表',
            });
        }

        const count = await markMessagesAsRead(ids, userId);

        res.json({
            success: true,
            message: `已将 ${count} 条消息标记为已读`,
            data: { count },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 批量标记已读失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '批量标记已读失败',
        });
    }
});

// 标记消息为已处理（管理员）
router.post('/:id/handle', async (req, res) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id;
        const { action } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PARAMS',
                message: '请提供处理动作',
            });
        }

        const success = await markMessageAsHandled(messageId, userId, action);

        if (!success) {
            return res.status(404).json({
                success: false,
                code: 'MESSAGE_NOT_FOUND',
                message: '消息不存在',
            });
        }

        res.json({
            success: true,
            message: '消息已标记为已处理',
        });
    } catch (error: any) {
        console.error('[MessageRoute] 标记已处理失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '标记已处理失败',
        });
    }
});

// 归档消息
router.post('/:id/archive', async (req, res) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id;

        const success = await archiveMessage(messageId, userId);

        if (!success) {
            return res.status(404).json({
                success: false,
                code: 'MESSAGE_NOT_FOUND',
                message: '消息不存在',
            });
        }

        res.json({
            success: true,
            message: '消息已归档',
        });
    } catch (error: any) {
        console.error('[MessageRoute] 归档消息失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '归档消息失败',
        });
    }
});

// 批量归档消息
router.post('/batch-archive', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PARAMS',
                message: '请提供要归档的消息ID列表',
            });
        }

        const count = await archiveMessages(ids, userId);

        res.json({
            success: true,
            message: `已归档 ${count} 条消息`,
            data: { count },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 批量归档消息失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '批量归档消息失败',
        });
    }
});

// 清理过期消息（管理员）
router.post('/cleanup-expired', async (req, res) => {
    try {
        const count = await cleanupExpiredMessages();

        res.json({
            success: true,
            message: `已归档 ${count} 条过期消息`,
            data: { count },
        });
    } catch (error: any) {
        console.error('[MessageRoute] 清理过期消息失败:', error);
        res.status(500).json({
            success: false,
            code: 'SYSTEM_ERROR',
            message: '清理过期消息失败',
        });
    }
});

export default router;
