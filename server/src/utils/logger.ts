/**
 * 统一日志服务
 * 使用 winston 进行日志管理,区分开发/生产环境
 */

import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

// 自定义日志格式
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let metaStr = '';
    if (Object.keys(metadata).length > 0) {
        metaStr = ' ' + JSON.stringify(metadata);
    }
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
});

// 创建 logger 实例
export const logger = winston.createLogger({
    level: isDev ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        isDev
            ? winston.format.combine(winston.format.colorize(), customFormat)
            : winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
        // 生产环境可添加文件传输
        // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// 简化的日志接口
export const log = {
    info: (message: string, meta?: object) => logger.info(message, meta),
    warn: (message: string, meta?: object) => logger.warn(message, meta),
    error: (message: string, meta?: object) => logger.error(message, meta),
    debug: (message: string, meta?: object) => logger.debug(message, meta),

    // API 请求日志
    request: (method: string, path: string, duration?: number) => {
        logger.info(`${method} ${path}`, { duration: duration ? `${duration}ms` : undefined });
    },

    // AI 服务日志
    ai: (action: string, details?: object) => {
        logger.info(`[AI] ${action}`, details);
    }
};

export default logger;
