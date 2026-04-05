/**
 * AgentConfigConfirmCard 配置确认卡片组件
 *
 * 展示风格、比例、配色、页数、设计要求等配置信息
 * 提供确认/修改/重新生成按钮，支持内联编辑
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RefreshCw, Edit2, Palette, Layout, Hash, FileText, X, Save, Coins, Sparkles, Layers } from 'lucide-react';
import type { AgentTask } from '../types/agent';

interface AgentConfigConfirmCardProps {
  task: AgentTask;
  onConfirm: (taskId: string) => void;
  onModify: (taskId: string, modifiedConfig: any) => void;
  onRegenerate: (taskId: string) => void;
  isLoading?: boolean;
  estimatedPoints?: number;
  isVip?: boolean;
  templateThumbnail?: string; // 模板预览图
}

// 可选的页面比例
const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'];

// 配色方案颜色标签
const COLOR_LABELS = ['主色', '辅色', '背景色', '文字色'];

export default function AgentConfigConfirmCard({
  task,
  onConfirm,
  onModify,
  onRegenerate,
  isLoading = false,
  estimatedPoints,
  isVip = false,
  templateThumbnail
}: AgentConfigConfirmCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 安全解析配置结果
  const parseTaskResult = (result: string | null): any => {
    if (!result) return null;
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error('[AgentConfigConfirmCard] JSON解析失败:', e, '原始数据:', result);
      return null;
    }
  };

  const resultData = useMemo(() => parseTaskResult(task.result), [task.result]);
  const config = resultData?.config;

  // 判断配置来源：用户选择模板还是 AI 自动生成
  const configSource = resultData?.configSource || 'ai_generated';
  const isUserSelected = configSource === 'user_selected';

  // 确保 colorPalette 是数组
  const getColorPalette = (palette: any): string[] => {
    if (Array.isArray(palette)) return palette;
    if (typeof palette === 'string') {
      try {
        const parsed = JSON.parse(palette);
        return Array.isArray(parsed) ? parsed : ['#000000', '#FFFFFF'];
      } catch {
        return ['#000000', '#FFFFFF'];
      }
    }
    return ['#000000', '#FFFFFF'];
  };

  const colorPalette = useMemo(() => getColorPalette(config?.colorPalette), [config?.colorPalette]);

  // 编辑状态的数据
  const [editData, setEditData] = useState({
    topic: resultData?.topic || '',
    styleName: config?.styleName || '',
    aspectRatio: config?.aspectRatio || '16:9',
    pageCount: config?.pageCount || 10,
    requirements: config?.requirements || '',
    pagesPerGeneration: config?.pagesPerGeneration || 1,
    transition: config?.pageStructure?.transition || 0
  });

  // 当 config 变化时更新 editData
  useEffect(() => {
    if (resultData && config) {
      setEditData({
        topic: resultData.topic || '',
        styleName: config.styleName || '',
        aspectRatio: config.aspectRatio || '16:9',
        pageCount: config.pageCount || 10,
        requirements: config.requirements || '',
        pagesPerGeneration: config.pagesPerGeneration || 1,
        transition: config.pageStructure?.transition || 0
      });
    }
  }, [resultData, config]);

  // 计算预估积分（如果没有传入）
  const calculatedPoints = estimatedPoints ?? (config?.pageCount ? config.pageCount * 2 : 20);

  if (!config) {
    return (
      <div className="p-4 text-sm text-gray-500">
        正在准备配置信息...
      </div>
    );
  }

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    // 重置为原始数据
    setEditData({
      topic: resultData?.topic || '',
      styleName: config.styleName || '',
      aspectRatio: config.aspectRatio || '16:9',
      pageCount: config.pageCount || 10,
      requirements: config.requirements || '',
      pagesPerGeneration: config.pagesPerGeneration || 1,
      transition: config.pageStructure?.transition || 0
    });
    setIsEditing(false);
  };

  // 保存修改
  const handleSaveEdit = () => {
    // 构建修改后的配置对象
    const modifiedConfig = {
      topic: editData.topic,
      styleName: editData.styleName,
      aspectRatio: editData.aspectRatio,
      pageCount: editData.pageCount,
      requirements: editData.requirements,
      pagesPerGeneration: editData.pagesPerGeneration,
      // 保留原有的配色和结构
      colorPalette: config.colorPalette,
      colorPaletteName: config.colorPaletteName,
      pageStructure: {
        cover: 1,
        directory: 1,
        transition: editData.transition,
        content: Math.max(1, editData.pageCount - 3 - editData.transition),
        end: 1
      }
    };
    onModify(task.id, modifiedConfig);
    setIsEditing(false);
  };

  // 更新编辑字段
  const updateEditField = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // 格式化积分显示
  const formatPoints = (points: number) => {
    if (points === 0) return '免费';
    return `${points} 积分`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2563eb]" />
          <span className="text-sm font-medium text-gray-700">配置确认</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isEditing ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {isEditing ? '编辑中' : '待确认'}
          </span>
          {/* 场景标识 */}
          {isUserSelected ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">
              已选模板
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
              AI生成
            </span>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* 主题 */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">演示主题</div>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.topic}
                  onChange={(e) => updateEditField('topic', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                  placeholder="请输入演示主题"
                />
              ) : (
                <div className="text-sm font-medium text-gray-800">{resultData.topic}</div>
              )}
            </div>
          </div>

          {/* 风格模板 */}
          <div className="flex items-start gap-3">
            <Palette className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">风格模板</div>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.styleName}
                  onChange={(e) => updateEditField('styleName', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                  placeholder="请输入风格名称"
                />
              ) : (
                <div className="text-sm font-medium text-gray-800">{config.styleName}</div>
              )}
            </div>
          </div>

          {/* 页面比例 */}
          <div className="flex items-start gap-3">
            <Layout className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">页面比例</div>
              {isEditing ? (
                <select
                  value={editData.aspectRatio}
                  onChange={(e) => updateEditField('aspectRatio', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                >
                  {ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium text-gray-800">{config.aspectRatio}</div>
              )}
            </div>
          </div>

          {/* 配色方案 - 改进展示 */}
          <div className="flex items-start gap-3">
            <div className="flex gap-1 mt-0.5">
              {colorPalette.slice(0, 4).map((color: string, idx: number) => (
                <div
                  key={idx}
                  className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={COLOR_LABELS[idx]}
                />
              ))}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">配色方案</div>
              <div className="text-sm font-medium text-gray-800">
                {config.colorPaletteName || '自定义配色'}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {colorPalette.slice(0, 4).map((color: string, idx: number) => (
                  <span key={idx} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {COLOR_LABELS[idx]}: {color}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 页数结构 */}
          <div className="flex items-start gap-3">
            <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">页面结构</div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">共</span>
                    <input
                      type="number"
                      value={editData.pageCount}
                      onChange={(e) => updateEditField('pageCount', parseInt(e.target.value) || 10)}
                      min={5}
                      max={50}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                    />
                    <span className="text-sm text-gray-600">页</span>
                  </div>
                  {/* 章节过渡页数 */}
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-sm text-gray-600">章节过渡</span>
                    <input
                      type="number"
                      value={editData.transition}
                      onChange={(e) => updateEditField('transition', parseInt(e.target.value) || 0)}
                      min={0}
                      max={10}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                    />
                    <span className="text-sm text-gray-600">页</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    (封面1 + 目录1 + 章节过渡{editData.transition} + 内容{Math.max(1, editData.pageCount - 3 - editData.transition)} + 结束1)
                  </span>
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-800">
                  共 {config.pageCount} 页
                  <span className="text-gray-500 font-normal ml-1">
                    (封面{config.pageStructure?.cover || 1} +
                    目录{config.pageStructure?.directory || 1} +
                    章节过渡{config.pageStructure?.transition || 0} +
                    内容{config.pageStructure?.content || Math.max(1, config.pageCount - 3 - (config.pageStructure?.transition || 0))} +
                    结束{config.pageStructure?.end || 1})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 每页生成数 */}
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">每页生成数</div>
              {isEditing ? (
                <select
                  value={editData.pagesPerGeneration}
                  onChange={(e) => updateEditField('pagesPerGeneration', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb]"
                >
                  <option value={1}>1页（精细）</option>
                  <option value={2}>2页（标准）</option>
                  <option value={4}>4页（快速）</option>
                </select>
              ) : (
                <div className="text-sm font-medium text-gray-800">
                  {config.pagesPerGeneration || 1}页
                  <span className="text-gray-500 font-normal ml-1">
                    ({config.pagesPerGeneration === 1 ? '精细模式' : config.pagesPerGeneration === 2 ? '标准模式' : '快速模式'})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 设计要求 */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500">设计要求</div>
              {isEditing ? (
                <textarea
                  value={editData.requirements}
                  onChange={(e) => updateEditField('requirements', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2563eb] resize-none"
                  placeholder="请输入设计要求（可选）"
                />
              ) : config.requirements ? (
                <div className="text-sm text-gray-700">{config.requirements}</div>
              ) : (
                <div className="text-sm text-gray-400 italic">无特殊要求</div>
              )}
            </div>
          </div>

          {/* 积分预估 */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            calculatedPoints === 0
              ? 'bg-green-50 text-green-700'
              : isVip
                ? 'bg-purple-50 text-purple-700'
                : 'bg-blue-50 text-blue-700'
          }`}>
            <Coins className="h-4 w-4" />
            <span className="text-sm font-medium">
              预计消耗：{formatPoints(calculatedPoints)}
            </span>
            {isVip && calculatedPoints > 0 && (
              <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                VIP优惠
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            {isEditing ? (
              // 编辑模式的按钮
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>取消</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>保存修改</span>
                </button>
              </>
            ) : (
              // 正常模式的按钮 - 根据配置来源显示不同选项
              <>
                {/* 场景A：用户已选模板 - 显示"重新生成"和"修改" */}
                {isUserSelected && (
                  <button
                    onClick={() => onRegenerate(task.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重新生成</span>
                  </button>
                )}

                {/* 场景B：AI自动生成 - 显示"重新生成"按钮 */}
                {!isUserSelected && (
                  <button
                    onClick={() => onRegenerate(task.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重新生成</span>
                  </button>
                )}

                {/* 修改按钮 - 两种场景都显示 */}
                <button
                  onClick={handleStartEdit}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>修改</span>
                </button>

                {/* 确认按钮 - 两种场景都显示 */}
                <button
                  onClick={() => onConfirm(task.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>确认配置</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
