/**
 * 回收箱 API 客户端
 */

import { client } from './client';

// ============================================================
// 类型定义
// ============================================================

export interface TrashItem {
  id: string;
  displayId: string | null;
  title: string;
  thumbnailUrl: string | null;
  deletedAt: string;
  deletedBy: string | null;
  expiresAt: string;
  remainingDays: number;
  slideCount: number;
  createdAt: string;
  userId: string | null;
  status: string;
  scenarioType?: string; // 项目类型：BUSINESS/TEMPLATE/等
}

export interface TrashListResult {
  items: TrashItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrashStats {
  total: number;
  expiring: number;
  userDeleted: number;
  adminDeleted: number;
}

export interface TrashListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  deletedBy?: 'user' | 'admin';
  status?: string;
  startDate?: string;
  endDate?: string;
  minRemainingDays?: number;
  maxRemainingDays?: number;
}

// ============================================================
// 用户端接口
// ============================================================

/**
 * 获取用户回收箱列表
 */
export async function getTrashList(params: TrashListParams = {}): Promise<TrashListResult> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
  if (params.keyword) queryParams.set('keyword', params.keyword);
  if (params.deletedBy) queryParams.set('deletedBy', params.deletedBy);
  if (params.status) queryParams.set('status', params.status);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.minRemainingDays !== undefined) queryParams.set('minRemainingDays', String(params.minRemainingDays));
  if (params.maxRemainingDays !== undefined) queryParams.set('maxRemainingDays', String(params.maxRemainingDays));

  const result = await client.get(`/trash?${queryParams.toString()}`) as any;
  return result.data;
}

/**
 * 获取用户回收箱统计
 */
export async function getTrashStats(): Promise<TrashStats> {
  const result = await client.get('/trash/stats') as any;
  return result.data;
}

/**
 * 恢复项目
 */
export async function restoreProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const result = await client.post(`/trash/${projectId}/restore`) as any;
  return result;
}

/**
 * 彻底删除项目
 */
export async function permanentDeleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const result = await client.delete(`/trash/${projectId}`) as any;
  return result;
}

/**
 * 批量恢复
 */
export async function batchRestore(projectIds: string[]): Promise<{
  success: boolean;
  restored: number;
  failed: number;
  errors: string[];
}> {
  const result = await client.post('/trash/batch-restore', { ids: projectIds }) as any;
  return result.data;
}

/**
 * 批量彻底删除
 */
export async function batchDelete(projectIds: string[]): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const result = await client.post('/trash/batch-delete', { ids: projectIds }) as any;
  return result.data;
}

/**
 * 清空回收箱
 */
export async function clearTrash(): Promise<{ success: boolean; message: string }> {
  const result = await client.delete('/trash/clear') as any;
  return result;
}

// ============================================================
// 管理员接口
// ============================================================

/**
 * 获取管理员回收箱列表
 */
export async function getAdminTrashList(params: TrashListParams & { userId?: string } = {}): Promise<TrashListResult> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
  if (params.keyword) queryParams.set('keyword', params.keyword);
  if (params.deletedBy) queryParams.set('deletedBy', params.deletedBy);
  if (params.status) queryParams.set('status', params.status);
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.minRemainingDays !== undefined) queryParams.set('minRemainingDays', String(params.minRemainingDays));
  if (params.maxRemainingDays !== undefined) queryParams.set('maxRemainingDays', String(params.maxRemainingDays));

  const result = await client.get(`/trash/admin?${queryParams.toString()}`) as any;
  return result.data;
}

/**
 * 获取管理员回收箱统计
 */
export async function getAdminTrashStats(): Promise<TrashStats> {
  const result = await client.get('/trash/admin/stats') as any;
  return result.data;
}

/**
 * 管理员恢复项目
 */
export async function adminRestoreProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const result = await client.post(`/trash/admin/${projectId}/restore`) as any;
  return result;
}

/**
 * 管理员彻底删除项目
 */
export async function adminDeleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const result = await client.delete(`/trash/admin/${projectId}`) as any;
  return result;
}

/**
 * 管理员批量恢复
 */
export async function adminBatchRestore(projectIds: string[]): Promise<{
  success: boolean;
  restored: number;
  failed: number;
  errors: string[];
}> {
  const result = await client.post('/trash/admin/batch-restore', { ids: projectIds }) as any;
  return result.data;
}

/**
 * 管理员批量删除
 */
export async function adminBatchDelete(projectIds: string[]): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const result = await client.post('/trash/admin/batch-delete', { ids: projectIds }) as any;
  return result.data;
}