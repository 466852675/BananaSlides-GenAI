/**
 * 错误处理工具
 * 区分开发/生产环境,安全地处理错误信息
 */

const isDev = process.env.NODE_ENV !== 'production';

export interface SafeError {
    message: string;
    code?: string;
    details?: string;
}

// 已知的业务错误,可以返回给用户
const KNOWN_ERROR_PATTERNS = [
    'API key not configured',
    'API 密钥未配置',
    'Rate limit exceeded',
    '请求过于频繁',
    'Invalid file type',
    '不支持的文件类型',
    'File too large',
    '文件过大',
    '网络连接失败',
    '服务暂时不可用',
    'SAFETY',  // AI 安全过滤
    'blocked',
    'Invalid API key',
    'API 密钥无效'
];

/**
 * 创建安全的错误响应
 * @param error 原始错误
 * @param context 错误上下文(用于日志)
 */
export const createSafeError = (error: any, context?: string): SafeError => {
    const errorMessage = error?.message || String(error);

    // 检查是否为已知错误
    const isKnown = KNOWN_ERROR_PATTERNS.some(pattern =>
        errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );

    // 开发环境或已知错误,返回详细信息
    if (isDev || isKnown) {
        return {
            message: errorMessage,
            code: error?.code || error?.status,
            details: context
        };
    }

    // 生产环境返回通用错误
    return {
        message: '服务器处理请求时发生错误,请稍后重试',
        code: 'INTERNAL_ERROR'
    };
};

/**
 * 记录错误日志
 * @param error 错误对象
 * @param context 错误上下文
 */
export const logError = (error: any, context: string) => {
    const timestamp = new Date().toISOString();

    console.error(`[${timestamp}] [${context}] Error:`, {
        message: error?.message,
        code: error?.code,
        // 开发环境显示完整堆栈
        stack: isDev ? error?.stack : undefined
    });
};

/**
 * 创建带错误处理的异步控制器包装器
 * @param fn 异步控制器函数
 * @param context 控制器名称
 */
export const asyncHandler = (fn: Function, context: string) => {
    return async (req: any, res: any, next: any) => {
        try {
            await fn(req, res, next);
        } catch (error: any) {
            logError(error, context);
            const safeError = createSafeError(error, context);
            res.status(500).json({
                success: false,
                error: safeError.message,
                code: safeError.code
            });
        }
    };
};

/**
 * 脱敏 API 密钥用于日志
 * @param key API 密钥
 */
export const maskApiKey = (key: string | undefined): string => {
    if (!key) return '[未设置]';
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
};
