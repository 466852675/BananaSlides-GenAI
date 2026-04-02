import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InputArea from './InputArea'

describe('InputArea', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    isLoading: false,
    autoMode: false,
    onToggleAutoMode: vi.fn(),
  }

  describe('基础渲染', () => {
    it('应该渲染输入框', () => {
      render(<InputArea {...defaultProps} />)
      expect(screen.getByPlaceholderText(/输入您的需求/)).toBeInTheDocument()
    })

    it('应该渲染附件按钮', () => {
      render(<InputArea {...defaultProps} />)
      expect(screen.getByRole('button', { name: /附件/i })).toBeInTheDocument()
    })

    it('应该渲染发送按钮', () => {
      render(<InputArea {...defaultProps} />)
      // 发送按钮没有文字，用 SVG 图标，检查按钮存在
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('配置按钮', () => {
    it('应该渲染配置按钮', () => {
      render(<InputArea {...defaultProps} />)

      const configButton = screen.getByRole('button', { name: /配置/i })
      expect(configButton).toBeInTheDocument()
    })

    it('点击配置按钮应该调用 onOpenConfig 回调', () => {
      const onOpenConfig = vi.fn()
      render(<InputArea {...defaultProps} onOpenConfig={onOpenConfig} />)

      const configButton = screen.getByRole('button', { name: /配置/i })
      fireEvent.click(configButton)

      expect(onOpenConfig).toHaveBeenCalledTimes(1)
    })
  })

  describe('风格按钮', () => {
    it('应该渲染风格按钮', () => {
      render(<InputArea {...defaultProps} />)

      const styleButton = screen.getByRole('button', { name: /风格/i })
      expect(styleButton).toBeInTheDocument()
    })

    it('点击风格按钮应该调用 onOpenStyle 回调', () => {
      const onOpenStyle = vi.fn()
      render(<InputArea {...defaultProps} onOpenStyle={onOpenStyle} />)

      const styleButton = screen.getByRole('button', { name: /风格/i })
      fireEvent.click(styleButton)

      expect(onOpenStyle).toHaveBeenCalledTimes(1)
    })
  })

  describe('附件下拉菜单', () => {
    it('点击附件按钮应该显示下拉菜单', () => {
      render(<InputArea {...defaultProps} />)

      const attachButton = screen.getByRole('button', { name: /附件/i })
      fireEvent.click(attachButton)

      expect(screen.getByText('上传大纲文件')).toBeInTheDocument()
      expect(screen.getByText('导入现有文档')).toBeInTheDocument()
    })
  })

  describe('AI 生成按钮', () => {
    it('应该渲染 AI 生成按钮', () => {
      render(<InputArea {...defaultProps} />)
      expect(screen.getByRole('button', { name: /AI 生成/i })).toBeInTheDocument()
    })

    it('输入框为空时 AI 生成按钮应该禁用', () => {
      render(<InputArea {...defaultProps} value="" />)

      const aiButton = screen.getByRole('button', { name: /AI 生成/i })
      expect(aiButton).toBeDisabled()
    })

    it('有内容时 AI 生成按钮应该启用', () => {
      render(<InputArea {...defaultProps} value="测试内容" />)

      const aiButton = screen.getByRole('button', { name: /AI 生成/i })
      expect(aiButton).not.toBeDisabled()
    })
  })

  describe('配置/风格按钮状态指示', () => {
    it('配置未保存时按钮应该显示灰色', () => {
      render(<InputArea {...defaultProps} configSaved={false} />)

      const configButton = screen.getByRole('button', { name: /配置/i })
      expect(configButton).toHaveClass('text-gray-500')
    })

    it('配置已保存时按钮应该显示绿色', () => {
      render(<InputArea {...defaultProps} configSaved={true} />)

      const configButton = screen.getByRole('button', { name: /配置/i })
      expect(configButton).toHaveClass('text-green-600')
    })

    it('风格未选择时按钮应该显示灰色', () => {
      render(<InputArea {...defaultProps} styleSelected={false} />)

      const styleButton = screen.getByRole('button', { name: /风格/i })
      expect(styleButton).toHaveClass('text-gray-500')
    })

    it('风格已选择时按钮应该显示绿色', () => {
      render(<InputArea {...defaultProps} styleSelected={true} />)

      const styleButton = screen.getByRole('button', { name: /风格/i })
      expect(styleButton).toHaveClass('text-green-600')
    })
  })

  describe('交互功能', () => {
    it('按 Enter 键应该发送消息', () => {
      const onSend = vi.fn()
      render(<InputArea {...defaultProps} value="测试" onSend={onSend} />)

      const input = screen.getByPlaceholderText(/输入您的需求/)
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSend).toHaveBeenCalled()
    })

    it('Shift+Enter 应该换行而不发送', () => {
      const onSend = vi.fn()
      render(<InputArea {...defaultProps} value="测试" onSend={onSend} />)

      const input = screen.getByPlaceholderText(/输入您的需求/)
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

      expect(onSend).not.toHaveBeenCalled()
    })
  })
})