import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationCard from './ConfirmationCard'
import type { AgentTask } from '../types/agent'

describe('ConfirmationCard', () => {
  const mockTask: AgentTask = {
    id: 'task-1',
    sessionId: 'session-1',
    type: 'OUTLINE',
    status: 'COMPLETED',
    priority: 1,
    progress: 100,
    retryCount: 0,
    createdAt: '2026-03-30T10:00:00Z',
    updatedAt: '2026-03-30T10:05:00Z',
    result: JSON.stringify({
      title: '演示文稿标题',
      slides: [
        { id: 'slide-1', title: '第一页', content: '内容概要' },
        { id: 'slide-2', title: '第二页', content: '内容概要' },
      ]
    })
  }

  const defaultProps = {
    task: mockTask,
    onConfirm: vi.fn(),
    onModify: vi.fn(),
    onRegenerate: vi.fn(),
    isLoading: false
  }

  describe('大纲确认', () => {
    it('应该渲染大纲确认标题', () => {
      render(<ConfirmationCard {...defaultProps} />)

      expect(screen.getByText('大纲确认')).toBeInTheDocument()
    })

    it('应该显示大纲内容', () => {
      render(<ConfirmationCard {...defaultProps} />)

      expect(screen.getByText('演示文稿标题')).toBeInTheDocument()
      expect(screen.getByText('第一页')).toBeInTheDocument()
      expect(screen.getByText('第二页')).toBeInTheDocument()
    })

    it('应该显示确认按钮', () => {
      render(<ConfirmationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /确认大纲/i })).toBeInTheDocument()
    })

    it('应该显示修改按钮', () => {
      render(<ConfirmationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /修改/i })).toBeInTheDocument()
    })

    it('应该显示重新生成按钮', () => {
      render(<ConfirmationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /重新生成/i })).toBeInTheDocument()
    })

    it('点击确认按钮应该调用 onConfirm 回调', () => {
      const onConfirm = vi.fn()
      render(<ConfirmationCard {...defaultProps} onConfirm={onConfirm} />)

      const confirmButton = screen.getByRole('button', { name: /确认大纲/i })
      fireEvent.click(confirmButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith('task-1')
    })

    it('点击修改按钮应该调用 onModify 回调', () => {
      const onModify = vi.fn()
      render(<ConfirmationCard {...defaultProps} onModify={onModify} />)

      const modifyButton = screen.getByRole('button', { name: /修改/i })
      fireEvent.click(modifyButton)

      expect(onModify).toHaveBeenCalledTimes(1)
      expect(onModify).toHaveBeenCalledWith('task-1')
    })

    it('点击重新生成按钮应该调用 onRegenerate 回调', () => {
      const onRegenerate = vi.fn()
      render(<ConfirmationCard {...defaultProps} onRegenerate={onRegenerate} />)

      const regenerateButton = screen.getByRole('button', { name: /重新生成/i })
      fireEvent.click(regenerateButton)

      expect(onRegenerate).toHaveBeenCalledTimes(1)
      expect(onRegenerate).toHaveBeenCalledWith('task-1')
    })
  })

  describe('加载状态', () => {
    it('加载时按钮应该禁用', () => {
      render(<ConfirmationCard {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /确认大纲/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /修改/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /重新生成/i })).toBeDisabled()
    })
  })

  describe('内容确认', () => {
    it('应该显示内容确认标题', () => {
      const contentTask = { ...mockTask, type: 'CONTENT' as any }
      render(<ConfirmationCard {...defaultProps} task={contentTask} />)

      expect(screen.getByText('内容确认')).toBeInTheDocument()
    })
  })

  describe('配图确认', () => {
    it('应该显示配图确认标题', () => {
      const imageTask = { ...mockTask, type: 'IMAGE' as any }
      render(<ConfirmationCard {...defaultProps} task={imageTask} />)

      expect(screen.getByText('配图确认')).toBeInTheDocument()
    })
  })
})