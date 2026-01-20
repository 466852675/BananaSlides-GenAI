import React, { useMemo } from "react";
import {
  Trash2,
  Sparkles,
  ImageIcon,
  Heart,
  BookTemplate,
  MoreHorizontal,
  Eye,
  Check,
  Clock,
  Edit3,
} from "lucide-react";
import { StyleTemplate, StylePreset, StyleConfig } from "../types";
import { formatTemplateId } from '../utils/idFormatter';

export type SharedStyleItem = StyleTemplate | StylePreset;

interface SharedStyleCardProps {
  item: SharedStyleItem;
  onDetail?: (item: SharedStyleItem) => void;
  onEdit?: (item: SharedStyleItem) => void;
  onApply?: (item: SharedStyleItem) => void;
  onDelete?: (id: string) => void;
  variant?: "library" | "favorites"; // To tweak minor display differences if needed
  isActive?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const SharedStyleCard: React.FC<SharedStyleCardProps> = ({
  item,
  onDetail,
  onEdit,
  onApply,
  onDelete,
  variant = "library",
  isActive = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  // Helper to extract thumbnail
  const thumbnailSrc = useMemo(() => {
    // Priority 1: sampleImages (from Preset)
    if (
      "sampleImages" in item &&
      item.sampleImages &&
      item.sampleImages.length > 0
    ) {
      return item.sampleImages[0];
    }
    // Priority 2: styleMap.cover (can be File/Blob or string URL)
    if (item.styleMap?.cover) {
      if (item.styleMap.cover instanceof Blob) {
        return URL.createObjectURL(item.styleMap.cover);
      }
      // If it's a string URL, use directly
      if (typeof item.styleMap.cover === "string") {
        return item.styleMap.cover;
      }
    }
    // Priority 3: Legacy styleFile (from Preset)
    if ("styleFile" in item && item.styleFile) {
      if (item.styleFile instanceof Blob) {
        return URL.createObjectURL(item.styleFile);
      }
      if (typeof item.styleFile === "string") {
        return item.styleFile;
      }
    }
    return null;
  }, [item]);

  // Helper for badges
  const isCustom = "isCustom" in item ? item.isCustom : true; // Presets are effectively custom

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full relative">
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/9] bg-slate-100 border-b border-slate-50 overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <div className="p-4 rounded-full bg-slate-100 mb-2">
              <ImageIcon size={24} />
            </div>
            <span className="text-[10px] font-medium">无预览图</span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 z-10">
          <div className="text-white text-xs font-medium backdrop-blur-sm px-2 py-1 rounded bg-white/20">
            {item.config.styleName || "未命名风格"}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          <span className="bg-slate-900/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/10">
            {item.config.targetPageCount}P
          </span>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`absolute top-2 right-12 z-20 p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm ${isFavorite
              ? "bg-rose-500/90 text-white hover:bg-rose-600"
              : "bg-white/40 text-white hover:bg-white hover:text-rose-500"
              }`}
            title={isFavorite ? "取消收藏" : "收藏风格"}
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}

        {/* System Preset Badge (Only for Library) */}
        {!isCustom && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-blue-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Sparkles size={10} /> 官方
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 pb-20 flex-1 flex flex-col space-y-3 relative">
        {/* Title & Metadata */}
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-0.5 select-all">
            {formatTemplateId(('templateId' in item && item.templateId) ? item.templateId : item.id, ('templateCreatedAt' in item ? (item as any).templateCreatedAt : undefined) || item.createdAt)}
          </div>
          <h4
            className="font-bold text-slate-800 text-sm truncate mb-1"
            title={item.name}
          >
            {item.name || item.config.styleName}
          </h4>
          <div className="flex items-center text-[10px] text-slate-400 gap-2">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
              {item.config.aspectRatio}
            </span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
            </span>
            <div className="w-px h-3 bg-slate-200"></div>
            {variant === 'favorites' ? (
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1">
                  <Clock size={10} className="text-slate-300" /> 创建: {new Date(('templateCreatedAt' in item ? item.templateCreatedAt : undefined) || item.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} className="text-slate-300" /> 更新: {new Date(('templateUpdatedAt' in item ? item.templateUpdatedAt : undefined) || ('updatedAt' in item ? (item as any).updatedAt : undefined) || item.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <Heart size={10} /> 收藏: {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-1">
                <Clock size={10} /> {new Date(item.createdAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).replace(/\//g, '-')}
              </span>
            )}
          </div>
        </div>

        {/* Structure Tags (The "Favorite" feature) */}
        <div className="flex flex-wrap gap-1.5">
          {item.config.pageStructure.cover > 0 && (
            <StructureTag
              label="封面"
              count={item.config.pageStructure.cover}
              color="purple"
            />
          )}
          {item.config.pageStructure.directory > 0 && (
            <StructureTag
              label="目录"
              count={item.config.pageStructure.directory}
              color="orange"
            />
          )}
          {item.config.pageStructure.transition > 0 && (
            <StructureTag
              label="过渡"
              count={item.config.pageStructure.transition}
              color="teal"
            />
          )}
          {item.config.pageStructure.content > 0 && (
            <StructureTag
              label="正文"
              count={item.config.pageStructure.content}
              color="indigo"
            />
          )}
          {item.config.pageStructure.end > 0 && (
            <StructureTag
              label="结束"
              count={item.config.pageStructure.end}
              color="slate"
            />
          )}
        </div>

        {/* Actions - Pushed to bottom */}
        <div className="absolute bottom-3 left-3 right-3 pt-2 bg-white border-t border-slate-100 flex flex-col gap-2">
          {/* Row: Detail, Edit, Apply, Delete */}
          <div className="flex gap-2">
            {onDetail && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDetail(item);
                }}
                className="px-3 flex justify-center items-center py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                title="查看详情"
              >
                <Eye size={16} />
              </button>
            )}

            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="px-3 flex justify-center items-center py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                title="编辑"
              >
                <Edit3 size={16} />
              </button>
            )}

            {onApply && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isActive) onApply(item);
                }}
                disabled={isActive}
                className={`flex-1 flex justify-center items-center py-2 rounded-xl text-xs font-bold transition-all ${isActive
                  ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
                  : "bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200"
                  }`}
              >
                {isActive ? (
                  <>
                    <Check size={14} className="mr-1" /> 已应用
                  </>
                ) : (
                  "应用"
                )}
              </button>
            )}

            {onDelete && isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="w-10 flex justify-center items-center border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Tags
const StructureTag: React.FC<{
  label: string;
  count: number;
  color: "purple" | "orange" | "teal" | "indigo" | "slate";
}> = ({ label, count, color }) => {
  const colorStyles = {
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colorStyles[color]}`}
    >
      {label}
      {count}
    </span>
  );
};
