/**
 * AgentWelcome Agent 模式欢迎界面
 *
 * 显示示例提示、热门推荐风格和快速开始入口
 */

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Target, Calendar, Rocket, Palette, Check, ChevronLeft, ChevronRight, Star, Heart, History, Copy } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { client } from '../api/client';
import { agentApi, type ProjectWithSession } from '../api/agent';

interface StyleTemplate {
  id: string;
  name: string;
  thumbnailUrl?: string;
  description?: string;
  style?: string;
  colorScheme?: string;
  aspectRatio?: string;
  recommendCount?: number;
  favoriteCount?: number;
  usageCount?: number;
  isOfficial?: boolean;
  styleMap?: Record<string, any>;
  config?: Record<string, any>;
}

interface AgentWelcomeProps {
  onExampleClick: (example: string) => void;
  onCreateProject?: (title: string) => Promise<string>;
  onStyleSelect?: (styleId: string | null, styleMap?: Record<string, any>, config?: Record<string, any>) => void;
  selectedStyleId?: string | null;
  onReuseConfig?: (config: Record<string, any>) => void;
}

interface RecentSession {
  id: string;
  projectId: string;
  projectTitle: string;
  config: Record<string, any>;
  createdAt: string;
  status: string;
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
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Calendar,
    title: '年度汇报',
    prompt: '帮我生成年度工作汇报演示文稿，包含项目成果、团队建设和未来规划三个部分',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Lightbulb,
    title: '创意策划',
    prompt: '制作一份品牌营销策划提案，为新品牌设计市场推广策略和创意方案',
    color: 'from-blue-500 to-blue-600'
  }
];

export default function AgentWelcome({
  onExampleClick,
  onCreateProject,
  onStyleSelect,
  selectedStyleId,
  onReuseConfig
}: AgentWelcomeProps) {
  // 热门推荐模板
  const [hotTemplates, setHotTemplates] = useState<StyleTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 我的收藏
  const [favoriteTemplates, setFavoriteTemplates] = useState<StyleTemplate[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // 最近成功的会话配置
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // 轮播索引
  const [carouselIndex, setCarouselIndex] = useState(0);
  const CAROUSEL_PAGE_SIZE = 4;

  // 选中的风格来源（互斥）
  const [selectedSource, setSelectedSource] = useState<'hot' | 'favorite' | null>(null);

  // 获取热门推荐模板
  useEffect(() => {
    const fetchHotTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await client.get('/templates') as unknown as any[];
        if (Array.isArray(response)) {
          // 筛选被设为推荐的模板（与 IDE 模式模板间热门推荐一致）
          const recommended = response
            .filter((t: any) => t.isRecommended === true)
            .sort((a: any, b: any) => {
              // 按热度分数排序（推荐数 + 收藏数 + 使用数）
              const scoreA = (a.recommendCount || 0) + (a.favoriteCount || 0) + (a.usageCount || 0);
              const scoreB = (b.recommendCount || 0) + (b.favoriteCount || 0) + (b.usageCount || 0);
              return scoreB - scoreA;
            });
          setHotTemplates(recommended.slice(0, 12)); // 最多展示12个
        }
      } catch (error) {
        console.log('Failed to fetch hot templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchHotTemplates();
  }, []);

  // 获取我的收藏
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const response = await client.get('/favorites') as unknown as any[];
        if (Array.isArray(response)) {
          // 转换数据格式以匹配 StyleTemplate 接口
          const transformed = response.map((fav: any) => ({
            id: fav.id,
            name: fav.name,
            thumbnailUrl: fav.sampleImages?.[0] || fav.styleMap?.cover || fav.styleMap?.content,
            styleMap: fav.styleMap,
            config: fav.config
          }));
          setFavoriteTemplates(transformed);
        }
      } catch (error) {
        console.log('Failed to fetch favorites:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, []);

  // 获取最近成功的会话配置（用于一键复用）
  useEffect(() => {
    const fetchRecentSessions = async () => {
      setLoadingRecent(true);
      try {
        // 获取用户最近完成的 Agent 会话（状态为 COMPLETED 且有配置）
        const response = await agentApi.getRecentSessions({ limit: 3, status: 'COMPLETED' });
        if (response.sessions && response.sessions.length > 0) {
          const recent: RecentSession[] = response.sessions.map((s: any) => ({
            id: s.id,
            projectId: s.projectId,
            projectTitle: s.project?.title || '未命名项目',
            config: s.config || {},
            createdAt: s.createdAt,
            status: s.status
          }));
          setRecentSessions(recent);
        }
      } catch (error) {
        console.log('Failed to fetch recent sessions:', error);
      } finally {
        setLoadingRecent(false);
      }
    };

    fetchRecentSessions();
  }, []);

  // 选择热门推荐模板
  const handleSelectHotTemplate = useCallback((template: StyleTemplate) => {
    if (selectedStyleId === template.id && selectedSource === 'hot') {
      // 取消选择
      setSelectedSource(null);
      onStyleSelect?.(null);
    } else {
      setSelectedSource('hot');
      onStyleSelect?.(template.id, template.styleMap, template.config);
    }
  }, [selectedStyleId, selectedSource, onStyleSelect]);

  // 选择我的收藏模板
  const handleSelectFavoriteTemplate = useCallback((template: StyleTemplate) => {
    if (selectedStyleId === template.id && selectedSource === 'favorite') {
      // 取消选择
      setSelectedSource(null);
      onStyleSelect?.(null);
    } else {
      setSelectedSource('favorite');
      onStyleSelect?.(template.id, template.styleMap, template.config);
    }
  }, [selectedStyleId, selectedSource, onStyleSelect]);

  // 轮播控制
  const handlePrevPage = () => {
    setCarouselIndex(Math.max(0, carouselIndex - 1));
  };

  const handleNextPage = () => {
    const maxIndex = Math.ceil(hotTemplates.length / CAROUSEL_PAGE_SIZE) - 1;
    setCarouselIndex(Math.min(maxIndex, carouselIndex + 1));
  };

  // 当前页的模板
  const visibleTemplates = hotTemplates.slice(
    carouselIndex * CAROUSEL_PAGE_SIZE,
    (carouselIndex + 1) * CAROUSEL_PAGE_SIZE
  );

  const totalPages = Math.ceil(hotTemplates.length / CAROUSEL_PAGE_SIZE);

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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
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
                onClick={() => {
                  // 只填充输入框，不自动创建项目
                  // 让用户自行决定何时发送
                  onExampleClick(example.prompt);
                }}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 transition-opacity group-hover:opacity-5`} />
                <div className="relative flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${example.color}`}>
                    <example.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-0.5 text-sm font-medium text-gray-800">
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

        {/* 热门推荐 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-600">
                热门推荐
              </h2>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={carouselIndex === 0}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-xs text-gray-400">
                  {carouselIndex + 1}/{totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={carouselIndex >= totalPages - 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {loadingTemplates ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-24 rounded-lg mb-2" />
                  <div className="bg-gray-200 h-3 w-3/4 rounded mb-1" />
                  <div className="bg-gray-200 h-2 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : hotTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无热门模板
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {visibleTemplates.map((template) => {
                const isSelected = selectedStyleId === template.id && selectedSource === 'hot';
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectHotTemplate(template)}
                    className={`relative overflow-hidden rounded-lg border-2 p-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* 缩略图 */}
                    <div className="mb-1.5 h-14 w-full overflow-hidden rounded bg-gray-100">
                      {(() => {
                        const previewUrl = template.styleMap?.cover || template.styleMap?.content || template.thumbnailUrl;
                        return previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={template.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Palette className="h-6 w-6 text-gray-300" />
                          </div>
                        );
                      })()}
                    </div>

                    {/* 模板信息 */}
                    <h3 className="text-xs font-medium text-gray-800 truncate">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      {template.style && (
                        <span className="text-[10px] text-gray-400">{template.style}</span>
                      )}
                      {template.colorScheme && (
                        <span className="text-[10px] text-gray-400">• {template.colorScheme}</span>
                      )}
                    </div>
                    {template.aspectRatio && (
                      <span className="text-[10px] text-gray-400">{template.aspectRatio}</span>
                    )}

                    {/* 热度指标 */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      {template.recommendCount && template.recommendCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          {template.recommendCount}
                        </span>
                      )}
                      {template.favoriteCount && template.favoriteCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5" />
                          {template.favoriteCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* 我的收藏 */}
        {favoriteTemplates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-gray-600">
                我的收藏
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {favoriteTemplates.slice(0, 4).map((template) => {
                const isSelected = selectedStyleId === template.id && selectedSource === 'favorite';
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectFavoriteTemplate(template)}
                    className={`relative overflow-hidden rounded-lg border-2 p-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* 缩略图 */}
                    <div className="mb-1.5 h-14 w-full overflow-hidden rounded bg-gray-100">
                      {(() => {
                        const previewUrl = template.styleMap?.cover || template.styleMap?.content || template.thumbnailUrl;
                        return previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={template.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Palette className="h-6 w-6 text-gray-300" />
                          </div>
                        );
                      })()}
                    </div>

                    <h3 className="text-xs font-medium text-gray-800 truncate">
                      {template.name}
                    </h3>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 最近使用的配置（一键复用） */}
        {recentSessions.length > 0 && onReuseConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-600">
                最近使用
              </h2>
              <span className="text-xs text-gray-400">一键复用配置</span>
            </div>

            <div className="space-y-2">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onReuseConfig?.(session.config)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Copy className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {session.projectTitle}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    点击复用
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 选中提示 */}
        {selectedStyleId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-gray-100 rounded-lg text-center"
          >
            <p className="text-xs text-gray-600">
              已选择风格模板，生成的配图将应用此风格
            </p>
            <button
              onClick={() => {
                setSelectedSource(null);
                onStyleSelect?.(null);
              }}
              className="mt-1 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              清除选择
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}