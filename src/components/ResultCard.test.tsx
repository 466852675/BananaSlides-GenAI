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

describe('ResultCard 撤回按钮', () => {
  it('previousContent 有值且非只读/修饰中时显示', () => {
    const item = { ...baseItem, previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={vi.fn()} onRefineContent={vi.fn()} />);
    expect(screen.getByTitle('撤回修饰')).toBeInTheDocument();
  });

  it('readOnly 模式不显示', () => {
    const item = { ...baseItem, previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={vi.fn()} onRefineContent={vi.fn()} readOnly />);
    expect(screen.queryByTitle('撤回修饰')).toBeNull();
  });

  it('previousContent 缺省时不显示', () => {
    render(<ResultCard item={baseItem} onUpdate={vi.fn()} onRefineContent={vi.fn()} />);
    expect(screen.queryByTitle('撤回修饰')).toBeNull();
  });

  it('isRefining 为 true 时不显示（修饰中）', () => {
    // onRefineContent 不 resolve 来保持 isRefining 为 true
    const onRefineContent = vi.fn().mockReturnValue(new Promise(() => {}));
    const item = { ...baseItem, textContent: '修饰后', previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={vi.fn()} onRefineContent={onRefineContent} />);
    fireEvent.click(screen.getByTitle('AI 智能修饰'));
    // 点击后 isRefining 变为 true，撤回按钮应隐藏
    expect(screen.queryByTitle('撤回修饰')).toBeNull();
  });

  it('点击撤回恢复 textContent 并清空 previousContent', () => {
    const onUpdate = vi.fn();
    const item = { ...baseItem, textContent: '修饰后', previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={onUpdate} onRefineContent={vi.fn()} />);
    fireEvent.click(screen.getByTitle('撤回修饰'));
    expect(onUpdate).toHaveBeenCalledWith({ textContent: '修饰前', previousContent: undefined });
  });

  it('撤回无确认弹窗（直接执行）', () => {
    const onUpdate = vi.fn();
    const onShowConfirm = vi.fn();
    const item = { ...baseItem, textContent: '修饰后', previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={onUpdate} onRefineContent={vi.fn()} onShowConfirm={onShowConfirm} />);
    fireEvent.click(screen.getByTitle('撤回修饰'));
    expect(onUpdate).toHaveBeenCalled();
    expect(onShowConfirm).not.toHaveBeenCalled();
  });
});

describe('ResultCard 手动编辑不撤回（边界 a 修正）', () => {
  it('手动编辑 textarea 时不清空 previousContent（撤回锚点保留）', () => {
    const onUpdate = vi.fn();
    const item = { ...baseItem, textContent: '修饰后', previousContent: '修饰前' };
    render(<ResultCard item={item} onUpdate={onUpdate} onRefineContent={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('在此输入正文内容...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '手动改了' } });
    const call = onUpdate.mock.calls[0][0];
    expect(call.textContent).toBe('手动改了');
    // 修正边界 a：手动编辑不主动清空撤回锚点，onUpdate 调用对象不含 previousContent key
    expect('previousContent' in call).toBe(false);
  });
});
