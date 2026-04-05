/**
 * InputArea 输入区域组件
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Check, Settings2, Palette, FileText, Upload, X, Loader2, Bot, Zap } from 'lucide-react';
import { BorderBeam } from './BorderBeam';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  autoMode: boolean;
  onToggleAutoMode: () => void;
  onOpenConfig?: () => void;
  onOpenStyle?: () => void;
  configSaved?: boolean;
  styleSelected?: boolean;
  onAIRefine?: (text: string) => Promise<void>;
  onFileUpload?: (type: 'outline' | 'document', file: File) => void;
}

export default function InputArea({
  value,
  onChange,
  onSend,
  isLoading,
  autoMode,
  onToggleAutoMode,
  onOpenConfig,
  onOpenStyle,
  configSaved = false,
  styleSelected = false,
  onAIRefine,
  onFileUpload
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isAIRefining, setIsAIRefining] = useState(false);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSend();
      }
    }
  };

  // AI 修饰处理
  const handleAIRefine = async () => {
    if (!value.trim() || !onAIRefine || isAIRefining) return;
    setIsAIRefining(true);
    try {
      await onAIRefine(value);
    } finally {
      setIsAIRefining(false);
    }
  };

  // 文件上传处理
  const handleFileSelect = (type: 'outline' | 'document') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(type, file);
    }
    setShowAttachMenu(false);
    e.target.value = '';
  };

  return (
    <div className="p-4">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        {/* 输入框容器 - 带跑马灯效果 */}
        <div className={`relative ${isAIRefining ? 'p-[2px] rounded-xl' : ''}`}>
          {isAIRefining && (
            <BorderBeam
              duration={3}
              colorFrom="#06b6d4"
              colorTo="#3b82f6"
              className="z-20"
            />
          )}
          <div className={`flex items-end gap-2 rounded-xl border bg-gray-50 p-2 ${
            isAIRefining
              ? 'border-transparent'
              : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
          }`}>
            {/* 附件按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="附件"
                title="附件"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* 附件下拉菜单 */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                  <div className="p-1">
                    <label className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>上传大纲文件</span>
                      <span className="text-xs text-gray-400 ml-auto">Word/MD</span>
                      <input
                        type="file"
                        accept=".doc,.docx,.md,.txt"
                        className="hidden"
                        onChange={handleFileSelect('outline')}
                      />
                    </label>
                    <label className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <Upload className="h-4 w-4 text-gray-500" />
                      <span>导入现有文档</span>
                      <span className="text-xs text-gray-400 ml-auto">PPT/PDF</span>
                      <input
                        type="file"
                        accept=".ppt,.pptx,.pdf"
                        className="hidden"
                        onChange={handleFileSelect('document')}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 文本输入 */}
            <div className="flex-1 relative">
              <label htmlFor="agent-input" className="sr-only">输入您的需求</label>
              <textarea
                id="agent-input"
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的需求，例如：生成一份关于AI发展的演示文稿..."
                className="w-full max-h-[120px] min-h-[32px] resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none pr-10"
                rows={1}
                disabled={isLoading}
                aria-label="消息输入框"
                aria-describedby="input-hint"
              />

              {/* AI 生成按钮 - 输入框内右下角 */}
              <button
                onClick={handleAIRefine}
                disabled={!value.trim() || isAIRefining}
                className={`absolute right-1 bottom-1 p-1.5 rounded-md transition-all ${
                  !value.trim()
                    ? 'text-gray-300 cursor-not-allowed'
                    : isAIRefining
                      ? 'text-blue-400 cursor-wait'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="AI 生成"
                title="AI 生成"
              >
                {isAIRefining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* 发送按钮 */}
            <button
              onClick={onSend}
              disabled={isLoading || !value.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              aria-label="发送"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* 底部选项 */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 模式切换 */}
            <button
              onClick={onToggleAutoMode}
              className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-full border ${
                autoMode
                  ? 'bg-blue-100 text-blue-700 border-blue-200 font-medium'
                  : 'bg-purple-100 text-purple-700 border-purple-200 font-medium'
              }`}
              title={autoMode ? '自动执行模式：Agent 自动完成所有步骤' : '引导模式：每一步都需要确认'}
            >
              {autoMode ? (
                <Zap className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              <span>{autoMode ? '自动执行' : '引导模式'}</span>
            </button>

            <div className="h-3 w-px bg-gray-200" />

            {/* 配置按钮 */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-1.5 text-xs hover:text-gray-700 ${
                configSaved ? 'text-blue-600' : 'text-gray-500'
              }`}
              title="配置"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>配置</span>
              {configSaved && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
            </button>

            {/* 风格按钮 */}
            <button
              onClick={onOpenStyle}
              className={`flex items-center gap-1.5 text-xs hover:text-gray-700 ${
                styleSelected ? 'text-blue-600' : 'text-gray-500'
              }`}
              title="风格"
            >
              <Palette className="h-3.5 w-3.5" />
              <span>风格</span>
              {styleSelected && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
            </button>
          </div>

          <div className="text-xs text-gray-400" id="input-hint">
            Enter 发送 · Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
}