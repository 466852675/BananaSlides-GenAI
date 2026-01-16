import React from 'react';
import { X, Play, FileText, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { GeneratedSlide, ProjectSession } from '../types';

interface StartProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectSession | null;
  pendingItems: GeneratedSlide[];
  onConfirmBatch: () => void;
  onOpenProject: () => void;
}

export const StartProjectModal: React.FC<StartProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  pendingItems,
  onConfirmBatch,
  onOpenProject
}) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Play size={20} className="fill-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">启动项目生成</h3>
              <p className="text-xs text-slate-500 font-medium">
                检测到 <span className="text-blue-600 font-bold">{pendingItems.length}</span> 个待生成页面任务
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
            <AlertCircle size={16} className="text-blue-500 shrink-0" />
            <p>以下页面内容已就绪，等待生成图片素材。您可以选择一键批量生成，或进入项目手动逐个生成。</p>
          </div>

          <div className="space-y-3">
            {pendingItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50 transition-all group">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg text-xs font-bold font-mono">
                  {item.pageNumber || index + 1}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.pageType === 'cover' ? 'bg-indigo-50 text-indigo-600' :
                      item.pageType === 'directory' ? 'bg-purple-50 text-purple-600' :
                      item.pageType === 'transition' ? 'bg-pink-50 text-pink-600' :
                      item.pageType === 'end' ? 'bg-slate-100 text-slate-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {item.pageType === 'cover' ? '封面页' :
                       item.pageType === 'directory' ? '目录页' :
                       item.pageType === 'transition' ? '过渡页' :
                       item.pageType === 'end' ? '结束页' : '正文页'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-700 truncate">
                      {item.title || "未命名页面"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {item.textContent && (
                       <span className="flex items-center gap-1">
                         <FileText size={10} /> 包含文本描述
                       </span>
                    )}
                    {(item.originalFile || item.previewUrl) && (
                       <span className="flex items-center gap-1">
                         <ImageIcon size={10} /> 包含参考图
                       </span>
                    )}
                  </div>
                </div>

                {/* Single Action Preview (Mock) */}
                <div className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                  等待生成
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <button
            onClick={onOpenProject}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all text-sm"
          >
            进入项目 (逐个生成)
          </button>
          <button
            onClick={onConfirmBatch}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Play size={16} className="fill-white" />
            一键批量生成 ({pendingItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};
