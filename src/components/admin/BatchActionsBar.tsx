import React, { useState } from 'react';
import {
  Check,
  X,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  Download,
  Mail,
  Tag,
  Archive,
  Eye,
  Edit2,
  AlertTriangle,
  Ban,
  Send
} from 'lucide-react';

export interface BatchAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

interface BatchActionsBarProps {
  selectedCount: number;
  actions: BatchAction[];
  onClear: () => void;
  maxVisible?: number; // 默认显示几个按钮，超出显示"更多"
}

// 方案 A：统一表格按钮风格（白底+彩色边框+hover浅色背景）
const VARIANT_STYLES: Record<string, {
  base: string;
  hover: string;
  icon: React.ReactNode;
}> = {
  primary: {
    base: 'bg-white border-violet-200 text-violet-600',
    hover: 'hover:bg-violet-50 hover:border-violet-300',
    icon: <Check size={14} />,
  },
  success: {
    base: 'bg-white border-emerald-200 text-emerald-600',
    hover: 'hover:bg-emerald-50 hover:border-emerald-300',
    icon: <Check size={14} />,
  },
  danger: {
    base: 'bg-white border-rose-200 text-rose-600',
    hover: 'hover:bg-rose-50 hover:border-rose-300',
    icon: <X size={14} />,
  },
  warning: {
    base: 'bg-white border-amber-200 text-amber-600',
    hover: 'hover:bg-amber-50 hover:border-amber-300',
    icon: <AlertTriangle size={14} />,
  },
  default: {
    base: 'bg-white border-slate-200 text-slate-600',
    hover: 'hover:bg-slate-50 hover:border-slate-300',
    icon: null,
  },
};

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  selectedCount,
  actions,
  onClear,
  maxVisible = 3,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (selectedCount === 0) return null;

  const visibleActions = actions.slice(0, maxVisible);
  const hiddenActions = actions.slice(maxVisible);
  const showDropdown = hiddenActions.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* 操作按钮组 */}
      <div className="flex items-center gap-1.5">
        {/* 可见按钮 */}
        {visibleActions.map((action) => {
          const style = VARIANT_STYLES[action.variant];
          return (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
                border transition-all duration-200 shadow-sm
                ${style.base} ${style.hover}
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={action.tooltip || action.label}
            >
              {action.icon || style.icon}
              <span>{action.label}</span>
            </button>
          );
        })}

        {/* 更多下拉菜单 */}
        {showDropdown && (
          <div className="relative">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
                bg-white border border-slate-200 text-slate-600
                hover:bg-slate-50 hover:border-slate-300
                transition-all duration-200 shadow-sm
                ${expanded ? 'bg-slate-50 border-slate-300' : ''}
              `}
            >
              <MoreHorizontal size={14} />
              <span>更多</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* 下拉菜单 */}
            {expanded && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExpanded(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 py-1 bg-white rounded-xl border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  {hiddenActions.map((action, index) => {
                    const style = VARIANT_STYLES[action.variant];
                    return (
                      <button
                        key={action.key}
                        onClick={() => {
                          action.onClick();
                          setExpanded(false);
                        }}
                        disabled={action.disabled}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 text-xs font-medium
                          text-left hover:bg-slate-50 transition-colors
                          ${action.variant === 'danger' ? 'text-rose-600' : 'text-slate-700'}
                          ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {action.icon || style.icon}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={onClear}
          className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          title="取消选择"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// 便捷函数：快速创建常用操作
export const createBatchActions = (
  handlers: {
    onApprove?: () => void;
    onReject?: () => void;
    onDelete?: () => void;
    onExport?: () => void;
    onEnable?: () => void;
    onDisable?: () => void;
    onEmail?: () => void;
    onTag?: () => void;
    onClose?: () => void;
    onArchive?: () => void;
    onNotify?: () => void;
    onAssign?: () => void;
    onFollowup?: () => void;
    onConvert?: () => void;
  }
): BatchAction[] => {
  const actions: BatchAction[] = [];

  if (handlers.onApprove) {
    actions.push({
      key: 'approve',
      label: '通过',
      icon: <Check size={14} />,
      variant: 'success',
      onClick: handlers.onApprove,
    });
  }

  if (handlers.onReject) {
    actions.push({
      key: 'reject',
      label: '拒绝',
      icon: <X size={14} />,
      variant: 'danger',
      onClick: handlers.onReject,
    });
  }

  if (handlers.onEnable) {
    actions.push({
      key: 'enable',
      label: '启用',
      icon: <Check size={14} />,
      variant: 'primary',
      onClick: handlers.onEnable,
    });
  }

  if (handlers.onDisable) {
    actions.push({
      key: 'disable',
      label: '禁用',
      icon: <Ban size={14} />,
      variant: 'warning',
      onClick: handlers.onDisable,
    });
  }

  if (handlers.onClose) {
    actions.push({
      key: 'close',
      label: '关闭订单',
      icon: <X size={14} />,
      variant: 'danger',
      onClick: handlers.onClose,
    });
  }

  if (handlers.onDelete) {
    actions.push({
      key: 'delete',
      label: '删除',
      icon: <Trash2 size={14} />,
      variant: 'danger',
      onClick: handlers.onDelete,
    });
  }

  if (handlers.onExport) {
    actions.push({
      key: 'export',
      label: '导出',
      icon: <Download size={14} />,
      variant: 'default',
      onClick: handlers.onExport,
    });
  }

  if (handlers.onEmail) {
    actions.push({
      key: 'email',
      label: '发送邮件',
      icon: <Mail size={14} />,
      variant: 'default',
      onClick: handlers.onEmail,
    });
  }

  if (handlers.onTag) {
    actions.push({
      key: 'tag',
      label: '批量标签',
      icon: <Tag size={14} />,
      variant: 'default',
      onClick: handlers.onTag,
    });
  }

  if (handlers.onArchive) {
    actions.push({
      key: 'archive',
      label: '归档',
      icon: <Archive size={14} />,
      variant: 'default',
      onClick: handlers.onArchive,
    });
  }

  if (handlers.onNotify) {
    actions.push({
      key: 'notify',
      label: '发送通知',
      icon: <Send size={14} />,
      variant: 'default',
      onClick: handlers.onNotify,
    });
  }

  if (handlers.onAssign) {
    actions.push({
      key: 'assign',
      label: '分配销售',
      icon: <Edit2 size={14} />,
      variant: 'default',
      onClick: handlers.onAssign,
    });
  }

  if (handlers.onFollowup) {
    actions.push({
      key: 'followup',
      label: '跟进记录',
      icon: <Edit2 size={14} />,
      variant: 'default',
      onClick: handlers.onFollowup,
    });
  }

  if (handlers.onConvert) {
    actions.push({
      key: 'convert',
      label: '转客户',
      icon: <Check size={14} />,
      variant: 'success',
      onClick: handlers.onConvert,
    });
  }

  return actions;
};
