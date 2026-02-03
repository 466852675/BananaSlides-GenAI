import { describe, it, expect } from 'bun:test';

describe('JWT 密钥安全', () => {
  const originalEnv = process.env.JWT_SECRET;

  it('应该在缺少 JWT_SECRET 时抛出错误', () => {
    delete process.env.JWT_SECRET;
    
    expect(() => {
      delete require.cache[require.resolve('../../utils/jwt.util')];
      require('../../utils/jwt.util');
    }).toThrow();
    
    process.env.JWT_SECRET = originalEnv;
  });

  it('应该接受有效的 JWT_SECRET', () => {
    process.env.JWT_SECRET = 'this-is-a-valid-secret-key-32-chars-long';
    
    delete require.cache[require.resolve('../../utils/jwt.util')];
    const { signToken, verifyToken } = require('../../utils/jwt.util');
    
    const payload = { userId: 'test123', role: 'USER' };
    const token = signToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    
    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe('test123');
    expect(decoded?.role).toBe('USER');
    
    process.env.JWT_SECRET = originalEnv;
  });

  it('应该验证失败的 JWT', () => {
    process.env.JWT_SECRET = 'valid-secret-key-minimum-32-characters';
    
    delete require.cache[require.resolve('../../utils/jwt.util')];
    const { verifyToken } = require('../../utils/jwt.util');
    
    const invalidToken = 'invalid.token.here';
    const decoded = verifyToken(invalidToken);
    
    expect(decoded).toBeNull();
    
    process.env.JWT_SECRET = originalEnv;
  });

  it('应该正确计算过期时间', () => {
    process.env.JWT_SECRET = 'valid-secret-key-minimum-32-characters';
    process.env.JWT_EXPIRES_IN = '7d';
    
    delete require.cache[require.resolve('../../utils/jwt.util')];
    const { getTokenExpiresIn } = require('../../utils/jwt.util');
    
    const seconds = getTokenExpiresIn();
    expect(seconds).toBe(7 * 24 * 3600);
    
    process.env.JWT_SECRET = originalEnv;
    delete process.env.JWT_EXPIRES_IN;
  });
});
