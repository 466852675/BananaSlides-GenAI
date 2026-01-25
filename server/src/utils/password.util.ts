// server/src/utils/password.util.ts
// 密码工具：哈希与验证

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * 对密码进行 bcrypt 哈希
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码是否匹配
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * 密码强度校验规则
 */
interface PasswordValidationResult {
    valid: boolean;
    message?: string;
}

/**
 * 验证密码强度
 * - 最少 8 位，最多 32 位
 * - 必须包含字母
 * - 必须包含数字
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
    if (!password) {
        return { valid: false, message: '密码不能为空' };
    }
    if (password.length < 8) {
        return { valid: false, message: '密码至少需要8位' };
    }
    if (password.length > 32) {
        return { valid: false, message: '密码最多32位' };
    }
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, message: '密码需要包含字母' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: '密码需要包含数字' };
    }
    return { valid: true };
}

/**
 * 生成随机验证码（6位数字）
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
