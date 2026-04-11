/**
 * 回收箱 API 路由
 *
 * 提供用户端和管理端回收箱操作接口
 */

import { Router, Request, Response } from 'express';
import { trashService } from '../services/trash.service';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================
// 用户端接口
// ============================================================

/**
 * GET /api/trash
 * 获取用户回收箱列表
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const keyword = req.query.keyword as string;
    const deletedBy = req.query.deletedBy as 'user' | 'admin';
    const status = req.query.status as string;
    const minRemainingDays = req.query.minRemainingDays ? parseInt(req.query.minRemainingDays as string) : undefined;
    const maxRemainingDays = req.query.maxRemainingDays ? parseInt(req.query.maxRemainingDays as string) : undefined;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }

    const result = await trashService.getUserTrashList(userId, {
      page,
      pageSize,
      keyword,
      deletedBy,
      status,
      startDate,
      endDate,
      minRemainingDays,
      maxRemainingDays
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 获取回收箱列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取回收箱列表失败'
    });
  }
});

/**
 * GET /api/trash/stats
 * 获取用户回收箱统计
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const stats = await trashService.getTrashStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Trash] 获取回收箱统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取回收箱统计失败'
    });
  }
});

// ============================================================
// 模板相关路由（必须在 /:id 路由之前定义）
// ============================================================

/**
 * POST /api/trash/template/:id/restore
 * 恢复模板
 */
router.post('/template/:id/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const templateId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 验证模板所有权
    const template = await require('../db').prisma.styleTemplate.findUnique({
      where: { id: templateId },
      select: { userId: true }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      });
    }

    if (template.userId !== userId) {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '无权恢复此模板'
        });
      }
    }

    const result = await trashService.restoreTemplate(templateId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 恢复模板失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '恢复模板失败'
    });
  }
});

/**
 * DELETE /api/trash/template/:id
 * 彻底删除模板
 */
router.delete('/template/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const templateId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 验证模板所有权
    const template = await require('../db').prisma.styleTemplate.findUnique({
      where: { id: templateId },
      select: { userId: true, isDeleted: true }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      });
    }

    if (!template.isDeleted) {
      return res.status(400).json({
        success: false,
        message: '模板不在回收箱中，请先移至回收箱'
      });
    }

    if (template.userId !== userId) {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '无权删除此模板'
        });
      }
    }

    const result = await trashService.permanentDeleteTemplate(templateId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 彻底删除模板失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '删除模板失败'
    });
  }
});

// ============================================================
// 项目相关路由
// ============================================================

/**
 * POST /api/trash/:id/restore
 * 恢复项目
 */
router.post('/:id/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 验证项目所有权
    const project = await require('../db').prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    if (project.userId !== userId) {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '无权恢复此项目'
        });
      }
    }

    const result = await trashService.restoreProject(projectId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 恢复项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '恢复项目失败'
    });
  }
});

/**
 * DELETE /api/trash/:id
 * 彻底删除项目
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 验证项目所有权
    const project = await require('../db').prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, isDeleted: true }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    if (!project.isDeleted) {
      return res.status(400).json({
        success: false,
        message: '项目不在回收箱中，请先移至回收箱'
      });
    }

    if (project.userId !== userId) {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '无权删除此项目'
        });
      }
    }

    const result = await trashService.permanentDeleteProject(projectId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 彻底删除项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '删除项目失败'
    });
  }
});

/**
 * POST /api/trash/batch-restore
 * 批量恢复
 */
router.post('/batch-restore', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要恢复的项目ID列表'
      });
    }

    // 批量上限
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        message: '单次最多恢复 20 个项目'
      });
    }

    const result = await trashService.batchRestore(ids, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 批量恢复失败:', error);
    res.status(500).json({
      success: false,
      message: '批量恢复失败'
    });
  }
});

/**
 * POST /api/trash/batch-delete
 * 批量彻底删除
 */
router.post('/batch-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的项目ID列表'
      });
    }

    // 批量上限
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        message: '单次最多删除 20 个项目'
      });
    }

    const result = await trashService.batchPermanentDelete(ids, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 批量删除失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败'
    });
  }
});

/**
 * POST /api/trash/clear
 * 清空回收箱
 */
router.delete('/clear', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await trashService.clearUserTrash(userId);

    res.json({
      success: true,
      message: `已清空回收箱，共删除 ${result.deleted} 个项目`
    });
  } catch (error) {
    console.error('[Trash] 清空回收箱失败:', error);
    res.status(500).json({
      success: false,
      message: '清空回收箱失败'
    });
  }
});

// ============================================================
// 管理员接口
// ============================================================

/**
 * GET /api/trash/admin
 * 获取所有用户回收箱列表（管理员）
 */
router.get('/admin', authenticate, requirePermission('admin.trash.view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const keyword = req.query.keyword as string;
    const deletedBy = req.query.deletedBy as 'user' | 'admin';
    const status = req.query.status as string;
    const userId = req.query.userId as string;
    const minRemainingDays = req.query.minRemainingDays ? parseInt(req.query.minRemainingDays as string) : undefined;
    const maxRemainingDays = req.query.maxRemainingDays ? parseInt(req.query.maxRemainingDays as string) : undefined;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }

    const result = await trashService.getAdminTrashList({
      page,
      pageSize,
      keyword,
      deletedBy,
      status,
      userId,
      startDate,
      endDate,
      minRemainingDays,
      maxRemainingDays
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 获取管理员回收箱列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员回收箱列表失败'
    });
  }
});

/**
 * GET /api/trash/admin/stats
 * 获取所有回收箱统计（管理员）
 */
router.get('/admin/stats', authenticate, requirePermission('admin.trash.view'), async (req: Request, res: Response) => {
  try {
    const stats = await trashService.getTrashStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Trash] 获取管理员回收箱统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员回收箱统计失败'
    });
  }
});

/**
 * POST /api/trash/admin/:id/restore
 * 管理员恢复项目
 */
router.post('/admin/:id/restore', authenticate, requirePermission('admin.trash.manage'), async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const operatorId = (req as any).user?.id;

    const result = await trashService.restoreProject(projectId, operatorId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 管理员恢复项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '恢复项目失败'
    });
  }
});

/**
 * DELETE /api/trash/admin/:id
 * 管理员彻底删除项目
 */
router.delete('/admin/:id', authenticate, requirePermission('admin.trash.manage'), async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const operatorId = (req as any).user?.id;

    const result = await trashService.permanentDeleteProject(projectId, operatorId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Trash] 管理员彻底删除项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '删除项目失败'
    });
  }
});

/**
 * POST /api/trash/admin/batch-restore
 * 管理员批量恢复
 */
router.post('/admin/batch-restore', authenticate, requirePermission('admin.trash.manage'), async (req: Request, res: Response) => {
  try {
    const operatorId = (req as any).user?.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要恢复的项目ID列表'
      });
    }

    const result = await trashService.batchRestore(ids, operatorId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 管理员批量恢复失败:', error);
    res.status(500).json({
      success: false,
      message: '批量恢复失败'
    });
  }
});

/**
 * POST /api/trash/admin/batch-delete
 * 管理员批量彻底删除
 */
router.post('/admin/batch-delete', authenticate, requirePermission('admin.trash.manage'), async (req: Request, res: Response) => {
  try {
    const operatorId = (req as any).user?.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的项目ID列表'
      });
    }

    const result = await trashService.batchPermanentDelete(ids, operatorId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Trash] 管理员批量删除失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败'
    });
  }
});

export default router;