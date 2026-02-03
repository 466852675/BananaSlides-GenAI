import { describe, it, expect } from 'bun:test';
import { ContentFilter, FilterResult } from '../../utils/content-filter';

describe('内容审核过滤器', () => {
  const filter = new ContentFilter();

  it('应该检测中文敏感词', () => {
    const result = filter.check('这是一段包含赌博的文本');
    expect(result.hasSensitive).toBe(true);
    expect(result.sensitiveWords).toContain('赌博');
    expect(['high', 'medium']).toContain(result.riskLevel);
  });

  it('应该检测英文敏感词', () => {
    const result = filter.check('This contains violence content');
    expect(result.hasSensitive).toBe(true);
    expect(result.sensitiveWords).toContain('violence');
  });

  it('应该检测变体词', () => {
    const result = filter.check('这是一段包含赌 bo 的内容');
    expect(result.hasSensitive).toBe(true);
    expect(result.sensitiveWords.length).toBeGreaterThan(0);
  });

  it('应该允许正常内容通过', () => {
    const result = filter.check('这是一个关于人工智能的技术演示');
    expect(result.hasSensitive).toBe(false);
    expect(result.sensitiveWords.length).toBe(0);
    expect(result.riskLevel).toBe('none');
  });
});
