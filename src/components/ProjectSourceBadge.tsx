/**
 * 项目来源徽章组件
 * 用于区分项目是通过 IDE 模式还是 Agent 模式创建
 */

import React from 'react';
import { Badge } from './ui/badge'; // 假设使用 shadcn/ui
import { Sparkles, Presentation } from 'lucide-react';

interface ProjectSourceBadgeProps {
  source: 'IDE' | 'AGENT';
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProjectSourceBadge: React.FC<ProjectSourceBadgeProps> = ({
  source,
  showIcon = true,
  showText = true,
  size = 'md'
}) => {
  const isAgent = source === 'AGENT';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge
      variant={isAgent ? 'default' : 'secondary'}
      className={`
        ${sizeClasses[size]}
        ${isAgent
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }
        font-medium
        transition-all
        flex items-center gap-1.5
      `}
    >
      {showIcon && (
        isAgent
          ? <Sparkles className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
          : <Presentation className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      )}
      {showText && (
        isAgent ? 'AI 生成' : '手动创建'
      )}
    </Badge>
  );
};

/**
 * 使用示例：
 *
 * // Agent 模式项目列表
 * {projects.map(project => (
 *   <div key={project.id} className="flex items-center justify-between">
 *     <span>{project.title}</span>
 *     <ProjectSourceBadge source={project.source} />
 *   </div>
 * ))}
 *
 * // 项目详情页
 * <ProjectSourceBadge source={project.source} size="lg" />
 *
 * // 仅显示图标
 * <ProjectSourceBadge source={project.source} showText={false} />
 */