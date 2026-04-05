/**
 * 状态标签组件
 *
 * 统一显示项目状态的标签，用于：
 * - Dashboard 项目卡片
 * - AgentSidebar 项目卡片
 * - AgentHeader 状态显示
 */

import React from 'react';
import { getStatusConfig } from '../../config/status-config';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  className = ''
}) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm'
  };

  return (
    <span
      className={`${sizeClasses[size]} rounded font-bold ${config.color} ${config.bgColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;