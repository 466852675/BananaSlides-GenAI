import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageBubble from './MessageBubble'
import type { AgentMessage } from '../types/agent'

describe('MessageBubble', () => {
  const mockUserMessage: AgentMessage = {
    id: 'msg-1',
    sessionId: 'session-1',
    role: 'user',
    content: '这是一条用户消息',
    isEdited: false,
    isDeleted: false,
    createdAt: '2026-03-30T10:00:00Z'
  }

  const mockAssistantMessage: AgentMessage = {
    id: 'msg-2',
    sessionId: 'session-1',
    role: 'assistant',
    content: '这是一条助手消息',
    isEdited: false,
    isDeleted: false,
    createdAt: '2026-03-30T10:01:00Z'
  }

  const defaultProps = {
    onEdit: vi.fn(),
    onReset: vi.fn(),
    isLoading: false
  }

  describe('用户消息', () => {
    it('应该渲染用户消息内容', () => {
      render(<MessageBubble message={mockUserMessage} {...defaultProps} />)

      expect(screen.getByText('这是一条用户消息')).toBeInTheDocument()
    })

    it('应该显示编辑按钮', async () => {
      const { container } = render(<MessageBubble message={mockUserMessage} {...defaultProps} />)

      // 触发鼠标进入事件显示按钮
      const messageBubble = container.querySelector('.flex.justify-end')
      fireEvent.mouseEnter(messageBubble!)

      expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
    })

    it('应该显示重置按钮', async () => {
      const { container } = render(<MessageBubble message={mockUserMessage} {...defaultProps} />)

      // 触发鼠标进入事件显示按钮
      const messageBubble = container.querySelector('.flex.justify-end')
      fireEvent.mouseEnter(messageBubble!)

      expect(screen.getByRole('button', { name: '重置' })).toBeInTheDocument()
    })

    it('点击编辑按钮应该调用 onEdit 回调', async () => {
      const onEdit = vi.fn()
      const { container } = render(<MessageBubble message={mockUserMessage} {...defaultProps} onEdit={onEdit} />)

      // 触发鼠标进入事件显示按钮
      const messageBubble = container.querySelector('.flex.justify-end')
      fireEvent.mouseEnter(messageBubble!)

      const editButton = screen.getByRole('button', { name: '编辑' })
      fireEvent.click(editButton)

      // 编辑模式开始，需要输入新内容并保存
      const textarea = screen.getByPlaceholderText('编辑消息...')
      fireEvent.change(textarea, { target: { value: '修改后的消息' } })

      const saveButton = screen.getByRole('button', { name: '保存' })
      fireEvent.click(saveButton)

      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onEdit).toHaveBeenCalledWith('msg-1', '修改后的消息')
    })

    it('点击重置按钮应该调用 onReset 回调', async () => {
      const onReset = vi.fn()
      const { container } = render(<MessageBubble message={mockUserMessage} {...defaultProps} onReset={onReset} />)

      // 触发鼠标进入事件显示按钮
      const messageBubble = container.querySelector('.flex.justify-end')
      fireEvent.mouseEnter(messageBubble!)

      const resetButton = screen.getByRole('button', { name: '重置' })
      fireEvent.click(resetButton)

      expect(onReset).toHaveBeenCalledTimes(1)
      expect(onReset).toHaveBeenCalledWith('msg-1')
    })

    it('已编辑的消息应该显示编辑标记', () => {
      const editedMessage = { ...mockUserMessage, isEdited: true }
      render(<MessageBubble message={editedMessage} {...defaultProps} />)

      expect(screen.getByText('(已编辑)')).toBeInTheDocument()
    })
  })

  describe('助手消息', () => {
    it('应该渲染助手消息内容', () => {
      render(<MessageBubble message={mockAssistantMessage} {...defaultProps} />)

      expect(screen.getByText('这是一条助手消息')).toBeInTheDocument()
    })

    it('助手消息不应该显示编辑按钮', async () => {
      const { container } = render(<MessageBubble message={mockAssistantMessage} {...defaultProps} />)

      // 触发鼠标进入事件
      const messageBubble = container.querySelector('.flex.gap-3')
      fireEvent.mouseEnter(messageBubble!)

      expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument()
    })

    it('助手消息不应该显示重置按钮', async () => {
      const { container } = render(<MessageBubble message={mockAssistantMessage} {...defaultProps} />)

      // 触发鼠标进入事件
      const messageBubble = container.querySelector('.flex.gap-3')
      fireEvent.mouseEnter(messageBubble!)

      expect(screen.queryByRole('button', { name: '重置' })).not.toBeInTheDocument()
    })
  })

  describe('加载状态', () => {
    it('加载时按钮应该禁用', async () => {
      const { container } = render(<MessageBubble message={mockUserMessage} {...defaultProps} isLoading={true} />)

      // 触发鼠标进入事件显示按钮
      const messageBubble = container.querySelector('.flex.justify-end')
      fireEvent.mouseEnter(messageBubble!)

      expect(screen.getByRole('button', { name: '编辑' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '重置' })).toBeDisabled()
    })
  })
})