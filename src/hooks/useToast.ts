// src/hooks/useToast.ts
// 轻量级 Toast Hook - 替代 alert() 调用

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface UseToastReturn {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    dismissToast: (id: string) => void;
    clearToasts: () => void;
    // 便捷方法
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

export function useToast(): UseToastReturn {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        // 自动消失
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // 便捷方法
    const success = useCallback((message: string, duration?: number) => {
        showToast(message, 'success', duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast(message, 'error', duration ?? 5000); // 错误消息默认显示更久
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast(message, 'warning', duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast(message, 'info', duration);
    }, [showToast]);

    return {
        toasts,
        showToast,
        dismissToast,
        clearToasts,
        success,
        error,
        warning,
        info
    };
}

// 全局 Toast 状态管理器（用于非组件环境）
let globalToastHandler: ((message: string, type: ToastType) => void) | null = null;

export function setGlobalToastHandler(handler: (message: string, type: ToastType) => void) {
    globalToastHandler = handler;
}

export function toast(message: string, type: ToastType = 'info') {
    if (globalToastHandler) {
        globalToastHandler(message, type);
    } else {
        // 降级方案：使用 console
        const logMethod = type === 'error' ? console.error : type === 'warning' ? console.warn : console.log;
        logMethod(`[Toast/${type}] ${message}`);
    }
}

export type { Toast, ToastType, UseToastReturn };
