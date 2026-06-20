import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultCard } from './ResultCard';

// Mock PointsBadge（内部用 AuthContext，测试环境不可用）
vi.mock('./PointsBadge', () => ({
  PointsBadge: () => null
}));

const baseItem = {
  id: '1', contentType: 'text' as const, pageType: 'content' as const,
  textContent: '原始内容', previousContent: undefined,
  previewUrl: '', variants: [], variantCount: 1, status: 'idle' as const, createdAt: 0
};

describe('ResultCard handleSmartRefine', () => {
  it('修饰开始时把当前 textContent 存入 previousContent', async () => {
    const onUpdate = vi.fn();
    const onRefineContent = vi.fn().mockResolvedValue('修饰后内容');
    render(
      <ResultCard
        item={baseItem}
        onUpdate={onUpdate}
        onRefineContent={onRefineContent}
      />
    );
    fireEvent.click(screen.getByTitle('AI 智能修饰'));
    // 等待异步 onRefineContent 解析
    await new Promise(r => setTimeout(r, 0));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ previousContent: '原始内容' }));
  });

  it('再修饰覆盖 previousContent 为本次修饰前值', async () => {
    const onUpdate = vi.fn();
    const onRefineContent = vi.fn().mockResolvedValue('再次修饰后');
    const item = { ...baseItem, textContent: '上次修饰后', previousContent: '最初原文' };
    render(
      <ResultCard item={item} onUpdate={onUpdate} onRefineContent={onRefineContent} />
    );
    fireEvent.click(screen.getByTitle('AI 智能修饰'));
    await new Promise(r => setTimeout(r, 0));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ previousContent: '上次修饰后' }));
  });
});
