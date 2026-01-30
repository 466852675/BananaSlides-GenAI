// src/hooks/useGenerationResume.ts
// 断点续传 Hook - 积分不足中断后保存/恢复上下文

import { useState, useCallback, useEffect } from 'react';

interface GenerationContext {
    /** 上下文 ID */
    id: string;
    /** 保存时间 */
    savedAt: string;
    /** 用户 ID */
    userId: string;
    /** 生成类型 */
    type: 'outline' | 'content' | 'image';
    /** 当前步骤 */
    step: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 主题/输入 */
    topic?: string;
    /** 已生成的大纲 */
    outline?: any[];
    /** 已完成的页面索引 */
    completedPages?: number[];
    /** 中断原因 */
    interruptReason: 'insufficient_points' | 'network_error' | 'user_cancel';
    /** 额外数据 */
    metadata?: Record<string, any>;
}

const STORAGE_KEY = 'banana_generation_resume';

export function useGenerationResume(userId?: string) {
    const [savedContext, setSavedContext] = useState<GenerationContext | null>(null);
    const [hasResumableSession, setHasResumableSession] = useState(false);

    // 加载保存的上下文
    useEffect(() => {
        if (!userId) return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const context = JSON.parse(stored) as GenerationContext;
                // 验证是否属于当前用户且在 24 小时内
                const savedTime = new Date(context.savedAt).getTime();
                const isRecent = Date.now() - savedTime < 24 * 60 * 60 * 1000;
                const isOwnSession = context.userId === userId;

                if (isRecent && isOwnSession) {
                    setSavedContext(context);
                    setHasResumableSession(true);
                } else {
                    // 过期或不属于当前用户，清理
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('[Resume] 加载断点上下文失败:', e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [userId]);

    // 保存断点上下文
    const saveContext = useCallback((context: Omit<GenerationContext, 'id' | 'savedAt' | 'userId'>) => {
        if (!userId) {
            console.warn('[Resume] 无法保存断点：用户未登录');
            return;
        }

        const fullContext: GenerationContext = {
            ...context,
            id: `resume_${Date.now()}`,
            savedAt: new Date().toISOString(),
            userId
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fullContext));
            setSavedContext(fullContext);
            setHasResumableSession(true);
            console.log('[Resume] 断点已保存:', fullContext.id);
        } catch (e) {
            console.error('[Resume] 保存断点失败:', e);
        }
    }, [userId]);

    // 恢复断点
    const resumeContext = useCallback(() => {
        if (savedContext) {
            console.log('[Resume] 恢复断点:', savedContext.id);
            return savedContext;
        }
        return null;
    }, [savedContext]);

    // 清除断点
    const clearContext = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSavedContext(null);
        setHasResumableSession(false);
        console.log('[Resume] 断点已清除');
    }, []);

    // 快捷方法：保存积分不足断点
    const saveInsufficientPointsContext = useCallback((data: {
        type: GenerationContext['type'];
        step: number;
        totalSteps: number;
        topic?: string;
        outline?: any[];
        completedPages?: number[];
        metadata?: Record<string, any>;
    }) => {
        saveContext({
            ...data,
            interruptReason: 'insufficient_points'
        });
    }, [saveContext]);

    return {
        /** 是否有可恢复的会话 */
        hasResumableSession,
        /** 保存的上下文 */
        savedContext,
        /** 保存断点 */
        saveContext,
        /** 恢复断点 */
        resumeContext,
        /** 清除断点 */
        clearContext,
        /** 保存积分不足断点 */
        saveInsufficientPointsContext
    };
}

export type { GenerationContext };
