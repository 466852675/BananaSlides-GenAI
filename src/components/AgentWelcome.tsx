/**
 * AgentWelcome Agent 模式欢迎界面
 *
 * 显示示例提示、风格选择和快速开始入口
 */

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Target, Calendar, Rocket, Palette, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { client } from '../api/client';

interface StyleTemplate {
  id: string;
  name: string;
  thumbnailUrl?: string;
  description?: string;
  color?: string;
  borderColor?: string;
}

interface AgentWelcomeProps {
  onExampleClick: (example: string) => void;
  onCreateProject?: (title: string) => Promise<string>;
  onStyleSelect?: (styleId: string | null) => void;
  selectedStyleId?: string | null;
}

// 示例场景
const EXAMPLES = [
  {
    icon: Target,
    title: '产品介绍',
    prompt: '生成一份关于我们公司新产品的演示文稿，产品是一款智能手表，具有健康监测和运动追踪功能',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Rocket,
    title: '技术分享',
    prompt: '创建一个关于 React 19 新特性的技术分享 PPT，重点介绍并发特性和性能优化',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Calendar,
    title: '年度汇报',
    prompt: '帮我生成年度工作汇报演示文稿，包含项目成果、团队建设和未来规划三个部分',
    color: 'from-orange-500 to-orange-600'
  },
  {
    icon: Lightbulb,
    title: '创意策划',
    prompt: '制作一份品牌营销策划提案，为新品牌设计市场推广策略和创意方案',
    color: 'from-green-500 to-green-600'
  }
];

// 预设风格（扩展为 StyleTemplate 类型）
const PRESET_STYLES: StyleTemplate[] = [
  {
    id: 'business',
    name: '商务简约',
    description: '专业大气，适合商务场景',
    color: 'bg-slate-100',
    borderColor: 'border-slate-300'
  },
  {
    id: 'tech',
    name: '科技感',
    description: '前沿现代，适合技术演示',
    color: 'bg-blue-100',
    borderColor: 'border-blue-300'
  },
  {
    id: 'creative',
    name: '创意活泼',
    description: '生动有趣，适合创意提案',
    color: 'bg-purple-100',
    borderColor: 'border-purple-300'
  },
  {
    id: 'minimal',
    name: '极简风格',
    description: '简洁干净，突出内容',
    color: 'bg-gray-100',
    borderColor: 'border-gray-300'
  }
];

export default function AgentWelcome({
  onExampleClick,
  onCreateProject,
  onStyleSelect,
  selectedStyleId
}: AgentWelcomeProps) {
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);

  // 获取用户收藏的风格模板
  useEffect(() => {
    const fetchStyleTemplates = async () => {
      setLoadingStyles(true);
      try {
        // 尝试获取用户收藏的风格
        const response = await client.get('/style-favorites') as unknown as any[];
        if (Array.isArray(response) && response.length > 0) {
          setStyleTemplates(response);
        }
      } catch (error) {
        console.log('No style favorites found, using presets');
      } finally {
        setLoadingStyles(false);
      }
    };

    fetchStyleTemplates();
  }, []);

  // 合并预设风格和用户收藏
  const allStyles = [...PRESET_STYLES, ...styleTemplates.slice(0, 4)];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">
            AI Agent 演示文稿助手
          </h1>
          <p className="text-gray-500">
            用自然语言描述需求，AI 自动为您生成专业演示文稿
          </p>
        </motion.div>

        {/* 示例场景 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="mb-4 text-sm font-semibold text-gray-600">
            快速开始
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXAMPLES.map((example, index) => (
              <motion.button
                key={example.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                onClick={async () => {
                  // 先设置输入框内容，确保用户能看到
                  onExampleClick(example.prompt);

                  // 然后创建项目（如果需要）
                  if (onCreateProject) {
                    try {
                      await onCreateProject(example.title);
                    } catch (error) {
                      console.error('Failed to create project:', error);
                      // 创建失败不影响输入框内容
                    }
                  }
                }}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-md"
              >
                {/* 背景渐变 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 transition-opacity group-hover:opacity-5`} />

                {/* 内容 */}
                <div className="relative flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${example.color}`}>
                    <example.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium text-gray-800">
                      {example.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {example.prompt.slice(0, 50)}...
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* 风格选择 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-600">
              选择风格
            </h2>
            {selectedStyleId && (
              <button
                onClick={() => onStyleSelect?.(null)}
                className="ml-auto text-xs text-gray-500 hover:text-gray-700"
              >
                清除选择
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allStyles.slice(0, 4).map((style) => {
              const isSelected = selectedStyleId === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => onStyleSelect?.(isSelected ? null : style.id)}
                  className={`relative overflow-hidden rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? 'border-black bg-gray-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}

                  {/* 缩略图或颜色块 */}
                  {style.thumbnailUrl ? (
                    <div className="mb-2 h-12 w-full overflow-hidden rounded bg-gray-100">
                      <img
                        src={style.thumbnailUrl}
                        alt={style.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`mb-2 h-12 w-full rounded ${style.color ?? 'bg-gray-100'}`} />
                  )}

                  <h3 className="text-xs font-medium text-gray-800 truncate">
                    {style.name}
                  </h3>
                  {style.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {style.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 使用提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-gray-400"
        >
          <p>输入您的需求，例如："生成一份关于 AI 发展的演示文稿"</p>
          <p className="mt-1">支持自然语言描述、导入文档、修改现有内容等多种方式</p>
        </motion.div>
      </div>
    </div>
  );
}