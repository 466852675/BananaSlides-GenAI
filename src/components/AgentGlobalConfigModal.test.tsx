import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AgentGlobalConfigModal from './AgentGlobalConfigModal'

describe('AgentGlobalConfigModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    config: {
      styleName: '商务简约',
      colorPalette: '蓝色系',
      aspectRatio: '16:9',
      requirements: '',
      targetPageCount: 10,
      defaultVariantCount: 1,
      pageStructure: {
        cover: 1,
        directory: 1,
        transition: 0,
        content: 8,
        end: 1
      }
    },
    styleMap: {
      cover: null,
      directory: null,
      transition: null,
      content: null,
      end: null,
      custom: null
    },
    onStyleMapChange: vi.fn()
  }

  describe('基础渲染', () => {
    it('应该渲染全局配置标题', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('全局配置')).toBeInTheDocument()
    })

    it('应该渲染风格选择区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('风格')).toBeInTheDocument()
    })

    it('应该渲染比例选择区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('比例')).toBeInTheDocument()
    })

    it('应该渲染配色选择区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('配色')).toBeInTheDocument()
    })

    it('应该渲染页面数量与结构区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('页面数量与结构')).toBeInTheDocument()
    })

    it('应该渲染全局设计要求区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('全局设计要求')).toBeInTheDocument()
    })

    it('应该渲染上传风格参考图区域', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByText('风格参考图')).toBeInTheDocument()
    })
  })

  describe('交互功能', () => {
    it('点击关闭按钮应该调用 onClose 回调', () => {
      const onClose = vi.fn()
      render(<AgentGlobalConfigModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: '关闭' })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('点击保存按钮应该调用 onSave 回调', () => {
      const onSave = vi.fn()
      render(<AgentGlobalConfigModal {...defaultProps} onSave={onSave} />)

      const saveButton = screen.getByRole('button', { name: '保存' })
      fireEvent.click(saveButton)

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('应该渲染取消按钮', () => {
      render(<AgentGlobalConfigModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    })
  })

  describe('关闭状态', () => {
    it('关闭时不应该渲染弹窗', () => {
      render(<AgentGlobalConfigModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('全局配置')).not.toBeInTheDocument()
    })
  })
})