
import React, { useEffect, useState } from 'react';
import { StyleConfig, PageStructure } from '../types';
import { Palette, LayoutTemplate, Monitor, Heart, BookTemplate, Check, FileDigit, AlertCircle } from 'lucide-react';

interface StyleControlsProps {
  config: StyleConfig;
  onChange: (key: keyof StyleConfig, value: any) => void;
  readOnly?: boolean;
}

export const STYLE_PRESETS = ["极简科技", "商务严谨", "时尚杂志", "扁平插画", "复古风"];
export const COLOR_PRESETS = ["经典蓝白", "黑金奢华", "活力橙灰", "莫兰迪色系", "极简黑白"];
export const RATIO_PRESETS = ["16:9", "4:3", "16:10", "1:1"];

export const StyleControls: React.FC<StyleControlsProps> = ({ config, onChange, readOnly = false }) => {
  
  // Calculate total configured pages
  const currentStructureSum = 
    config.pageStructure.cover + 
    config.pageStructure.directory + 
    config.pageStructure.transition + 
    config.pageStructure.content + 
    config.pageStructure.end;

  const isOverLimit = currentStructureSum > config.targetPageCount;
  const isUnderLimit = currentStructureSum < config.targetPageCount;

  const handleStructureChange = (key: keyof PageStructure, value: number) => {
      const newStructure = { ...config.pageStructure, [key]: value };
      onChange('pageStructure', newStructure);
  };

  return (
    <div className="h-full relative pr-1">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 h-full">
          
          {/* Column 1 (Left): Style, Ratio, Palette */}
          <div className="col-span-1 space-y-5">
              
              {/* PPT Style */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <LayoutTemplate size={16} className="text-slate-500" />
                   <label className="text-sm font-bold text-slate-700">风格</label>
                </div>
                {!readOnly && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                    {STYLE_PRESETS.slice(0, 4).map(style => (
                        <button
                        key={style}
                        onClick={() => onChange('styleName', style)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                            config.styleName === style
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                        >
                        {style}
                        </button>
                    ))}
                    </div>
                )}
                <input
                  type="text"
                  value={config.styleName}
                  onChange={(e) => onChange('styleName', e.target.value)}
                  placeholder="输入风格描述..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={readOnly}
                />
              </div>

              {/* Ratio */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <Monitor size={16} className="text-slate-500" />
                   <label className="text-sm font-bold text-slate-700">比例</label>
                </div>
                <div className="flex flex-wrap gap-2">
                    {readOnly ? (
                         <div className="px-3 py-1.5 bg-slate-100 rounded text-sm text-slate-700">{config.aspectRatio}</div>
                    ) : (
                        RATIO_PRESETS.map(ratio => (
                            <button
                            key={ratio}
                            onClick={() => onChange('aspectRatio', ratio)}
                            className={`flex-1 text-xs px-2 py-1.5 rounded border text-center transition-colors ${
                                config.aspectRatio === ratio
                                ? 'bg-slate-800 text-white border-slate-800 font-medium'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                            >
                            {ratio}
                            </button>
                        ))
                    )}
                </div>
              </div>

              {/* Palette with Custom Input */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <Palette size={16} className="text-slate-500" />
                   <label className="text-sm font-bold text-slate-700">配色</label>
                </div>
                 <select 
                    value={COLOR_PRESETS.includes(config.colorPalette) ? config.colorPalette : "custom"} 
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "custom") onChange('colorPalette', val);
                        else onChange('colorPalette', ''); // Clear for custom input
                    }}
                    disabled={readOnly}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 disabled:bg-slate-50 text-slate-700 mb-2"
                 >
                     <option value="" disabled>选择配色方案</option>
                     {COLOR_PRESETS.map(color => (
                         <option key={color} value={color}>{color}</option>
                     ))}
                     <option value="custom">自定义配色...</option>
                 </select>
                 
                 {/* Always show input to allow refinement or custom entry */}
                 <input
                    type="text"
                    value={config.colorPalette}
                    onChange={(e) => onChange('colorPalette', e.target.value)}
                    placeholder="输入自定义配色 (如: 红黑渐变, 莫兰迪蓝...)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all text-slate-600"
                    disabled={readOnly}
                 />
              </div>
          </div>

          {/* Column 2 (Right): Page Planning */}
          <div className="col-span-1 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                 <FileDigit size={16} className="text-slate-500" />
                 <label className="text-sm font-bold text-slate-700">页面数量与结构</label>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex-1 flex flex-col">
                  {/* Total Count */}
                  <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-slate-600 font-medium">生成总页数</span>
                      <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min={1} 
                            max={50}
                            value={config.targetPageCount}
                            onChange={(e) => onChange('targetPageCount', parseInt(e.target.value) || 10)}
                            disabled={readOnly}
                            className="w-16 text-center text-sm border border-slate-200 rounded py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400">页</span>
                      </div>
                  </div>

                  <div className="h-px bg-slate-200 mb-3"></div>

                  {/* Page Structure Inputs - Reduced vertical spacing */}
                  <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                          <span className="text-slate-500">封面 (固)</span>
                          <span className="text-slate-600 font-medium">1P</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                          <span className="text-slate-500">目录 (固)</span>
                          <span className="text-slate-600 font-medium">1P</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                          <span className="text-slate-700 font-medium">章节过渡</span>
                          <div className="flex items-center gap-1">
                              <input 
                                type="number" min={0} max={10}
                                value={config.pageStructure.transition}
                                onChange={(e) => handleStructureChange('transition', parseInt(e.target.value) || 0)}
                                disabled={readOnly}
                                className="w-12 text-center border-b border-slate-200 focus:border-indigo-500 outline-none text-indigo-600 font-medium bg-transparent"
                              />
                              <span className="text-slate-400">P</span>
                          </div>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                          <span className="text-slate-700 font-medium">内容正文</span>
                          <div className="flex items-center gap-1">
                              <input 
                                type="number" min={1} max={50}
                                value={config.pageStructure.content}
                                onChange={(e) => handleStructureChange('content', parseInt(e.target.value) || 1)}
                                disabled={readOnly}
                                className="w-12 text-center border-b border-slate-200 focus:border-indigo-500 outline-none text-indigo-600 font-medium bg-transparent"
                              />
                              <span className="text-slate-400">P</span>
                          </div>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                          <span className="text-slate-500">结束页 (固)</span>
                          <span className="text-slate-600 font-medium">1P</span>
                      </div>
                  </div>

                  {/* Validation Message */}
                  {(isOverLimit || isUnderLimit) && (
                      <div className={`mt-auto pt-2 text-[10px] flex items-start gap-1.5 p-2 rounded ${isOverLimit ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                          <AlertCircle size={12} className="shrink-0 mt-0.5"/>
                          <span>
                              {isOverLimit 
                                ? `超出 ${config.targetPageCount} 页 (当前 ${currentStructureSum})` 
                                : `少于 ${config.targetPageCount} 页 (当前 ${currentStructureSum})`
                              }
                          </span>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
