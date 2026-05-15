import React, { useState } from 'react';
import { Settings, Shield, Clock, Search, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { useCommercial, COMMERCIAL_MODULES } from '../../hooks/useCommercial';
import type { CommercialModuleId } from '../../hooks/useCommercial';
import { CommercialDisableModal } from './CommercialDisableModal';

type TabKey = 'audit-log' | 'commercial';

const SEVERITY_LABELS: Record<string, string> = {
  info: '信息', low: '低', medium: '中', high: '高', critical: '严重',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-slate-100 text-slate-600',
  low: 'bg-green-100 text-green-600',
  medium: 'bg-amber-100 text-amber-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
};

const TYPE_MODULE_MAP: Record<string, string> = {
  ADMIN_USER: '用户管理',
  ADMIN_ORDER: '订单管理',
  ADMIN_REFUND: '退款管理',
  ADMIN_POINTS_RULE: '积分规则',
  ADMIN_PRODUCT: '产品管理',
  ADMIN_ROLE: '角色权限',
  ADMIN_ENGINE_RULE: '模型引擎',
  ADMIN_SYSTEM: '系统配置',
  ADMIN_COMMERCIAL: '系统配置',
  RESOURCE: '资源管理',
  LEAD: '销售线索',
  PROJECT: '创作室',
  SNAPSHOT: '历史库',
  TEMPLATE: '模板间',
  TRASH: '回收箱',
  AUTH: '登录',
  EXPORT: '导出',
  CONTENT_VIOLATION: '安全事件',
  PROMPT_INJECTION: '安全事件',
};

const getModuleLabel = (type: string): string => {
  const prefix = Object.keys(TYPE_MODULE_MAP).find(k => type.startsWith(k));
  return prefix ? TYPE_MODULE_MAP[prefix] : '其他';
};

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('audit-log');
  const commercial = useCommercial();
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const [commercialModalMode, setCommercialModalMode] = useState<'disable' | 'enable'>('disable');

  // 审计日志查询
  const [logPage, setLogPage] = useState(1);
  const [logType, setLogType] = useState('');
  const [logSeverity, setLogSeverity] = useState('');
  const [logKeyword, setLogKeyword] = useState('');
  const [logTimeRange, setLogTimeRange] = useState('');

  const getTimeFilter = () => {
    if (!logTimeRange) return {};
    const now = new Date();
    const start = new Date(now);
    if (logTimeRange === 'today') start.setHours(0, 0, 0, 0);
    else if (logTimeRange === '7d') start.setDate(start.getDate() - 7);
    else if (logTimeRange === '30d') start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString() };
  };

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ['audit-logs', logPage, logType, logSeverity, logKeyword, logTimeRange],
    queryFn: () => AdminApi.getAuditLogs({
      page: logPage, limit: 20,
      type: logType || undefined,
      severity: logSeverity || undefined,
      keyword: logKeyword || undefined,
      ...getTimeFilter(),
    }),
    placeholderData: (previousData) => previousData,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogKeyword(e.target.value);
    setLogPage(1);
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden pr-2">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-xl shadow-slate-900/20 w-full shrink-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight mb-1">系统设置</h1>
              <p className="text-slate-400 text-sm font-medium opacity-90">全局控制台</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-mono text-slate-300">v1.2.0-beta</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 bg-white/80 backdrop-blur-xl rounded-t-2xl px-6">
        <button
          onClick={() => setActiveTab('audit-log')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'audit-log'
              ? 'text-slate-900 border-violet-600'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
        >
          <Shield size={16} /> 系统操作日志
          {logData?.pagination && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
              {logData.pagination.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('commercial')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'commercial'
              ? 'text-slate-900 border-violet-600'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
        >
          <DollarSign size={16} /> 商业化功能
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'audit-log' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 h-full flex flex-col">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                {[
                  { key: '', label: '全部' },
                  { key: 'today', label: '今天' },
                  { key: '7d', label: '近7天' },
                  { key: '30d', label: '近30天' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setLogTimeRange(t.key); setLogPage(1); }}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      logTimeRange === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
              <select
                value={logType}
                onChange={e => { setLogType(e.target.value); setLogPage(1); }}
                className="text-[11px] font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              >
                <option value="">全部模块</option>
                <option value="ADMIN_USER">用户管理</option>
                <option value="ADMIN_ORDER">订单管理</option>
                <option value="ADMIN_REFUND">退款管理</option>
                <option value="ADMIN_POINTS_RULE">积分规则</option>
                <option value="ADMIN_PRODUCT">产品管理</option>
                <option value="ADMIN_ROLE">角色权限</option>
                <option value="ADMIN_ENGINE_RULE">模型引擎</option>
                <option value="ADMIN_SYSTEM,ADMIN_COMMERCIAL">系统配置</option>
                <option value="LEAD">销售线索</option>
                <option value="RESOURCE">资源管理</option>
                <option value="CONTENT_VIOLATION,PROMPT_INJECTION">安全事件</option>
                <option value="AUTH">登录</option>
                <option value="PROJECT">创作室</option>
                <option value="SNAPSHOT">历史库</option>
                <option value="TEMPLATE">模板间</option>
                <option value="TRASH">回收箱</option>
                <option value="EXPORT">导出</option>
              </select>
              <select
                value={logSeverity}
                onChange={e => { setLogSeverity(e.target.value); setLogPage(1); }}
                className="text-[11px] font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              >
                <option value="">全部级别</option>
                <option value="info">信息</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">严重</option>
              </select>
              <div className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Search size={14} className="text-slate-400" />
                <input
                  value={logKeyword}
                  onChange={handleSearch}
                  placeholder="搜索操作内容..."
                  className="text-[11px] bg-transparent outline-none w-32"
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {logLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
                </div>
              ) : !logData?.items?.length ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                  <Clock size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-semibold">暂无操作日志</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="text-left py-2 pr-2 w-[150px]">时间</th>
                      <th className="text-left py-2 px-2">操作内容</th>
                      <th className="text-left py-2 px-2 w-[60px]">级别</th>
                      <th className="text-left py-2 px-2 w-[70px]">操作人</th>
                      <th className="text-left py-2 pl-2 w-[100px]">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logData.items.map((entry: AdminApi.AuditLogEntry) => (
                      <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-2 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-violet-50 text-violet-600 whitespace-nowrap">
                              {getModuleLabel(entry.type)}
                            </span>
                            <span className="text-[12px] text-slate-700">{entry.content}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${SEVERITY_COLORS[entry.severity?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                            {SEVERITY_LABELS[entry.severity?.toLowerCase()] || entry.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-[11px] text-slate-500">{entry.userName || 'system'}</td>
                        <td className="py-2.5 pl-2 text-[10px] text-slate-400 font-mono">{entry.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {logData?.pagination && logData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-slate-100 shrink-0">
                <button
                  disabled={logPage <= 1}
                  onClick={() => setLogPage(p => p - 1)}
                  className="px-3 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >‹ 上一页</button>
                {Array.from({ length: Math.min(logData.pagination.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, logPage - 2);
                  const page = start + i;
                  if (page > logData.pagination.totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setLogPage(page)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-lg border ${
                        logPage === page ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >{page}</button>
                  );
                })}
                <button
                  disabled={logPage >= logData.pagination.totalPages}
                  onClick={() => setLogPage(p => p + 1)}
                  className="px-3 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >下一页 ›</button>
                <span className="text-[10px] text-slate-400 ml-2">共 {logData.pagination.total} 条</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commercial' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 overflow-y-auto h-full">
            {/* Master Switch + 模块配置按钮 */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">💰</div>
                <div>
                  <div className="text-sm font-bold text-slate-800">商业化功能总开关</div>
                  <div className={`text-[11px] font-semibold mt-0.5 ${commercial.enabled ? 'text-green-600' : 'text-red-600'}`}>
                    ● {commercial.enabled ? '已开启' : '已关闭'}
                    {commercial.enabled && ` · ${10 - commercial.disabledModules.length}/10 模块运行中`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setCommercialModalMode(commercial.enabled ? 'disable' : 'enable'); setShowCommercialModal(true); }}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-[11px] hover:bg-slate-50 transition-all whitespace-nowrap"
                >⚙️ 模块配置</button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commercial.enabled}
                    onChange={() => {
                      if (commercial.enabled) {
                        setCommercialModalMode('disable');
                        setShowCommercialModal(true);
                      } else {
                        setCommercialModalMode('enable');
                        setShowCommercialModal(true);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-red-600" />
                </label>
              </div>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">👤 用户侧模块</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {['points', 'checkin', 'invite', 'purchase'].map(id => {
                    const disabled = commercial.isModuleDisabled(id as CommercialModuleId);
                    return (
                      <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border ${disabled ? 'bg-white border-red-200 text-red-500' : 'bg-white border-green-200 text-green-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${disabled ? 'bg-red-500' : 'bg-green-500'}`} />
                        {COMMERCIAL_MODULES[id as keyof typeof COMMERCIAL_MODULES]?.label}
                        <span className="ml-auto text-[9px] text-slate-400">{id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">🔧 管理后台模块</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {['orders', 'refunds', 'leads', 'points-rules', 'growth'].map(id => {
                    const disabled = commercial.isModuleDisabled(id as CommercialModuleId);
                    return (
                      <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border ${disabled ? 'bg-white border-red-200 text-red-500' : 'bg-white border-green-200 text-green-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${disabled ? 'bg-red-500' : 'bg-green-500'}`} />
                        {COMMERCIAL_MODULES[id as keyof typeof COMMERCIAL_MODULES]?.label}
                        <span className="ml-auto text-[9px] text-slate-400">{id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Landing Page Module */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">🌐 官网落地页模块</div>
              <div className="flex gap-1.5">
                {['pricing'].map(id => {
                  const disabled = commercial.isModuleDisabled(id as CommercialModuleId);
                  return (
                    <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border ${disabled ? 'bg-white border-red-200 text-red-500' : 'bg-white border-green-200 text-green-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${disabled ? 'bg-red-500' : 'bg-green-500'}`} />
                      {COMMERCIAL_MODULES[id as keyof typeof COMMERCIAL_MODULES]?.label}
                      <span className="ml-auto text-[9px] text-slate-400">{id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Change */}
            {commercial.auditLog.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 mb-2">📋 最近变更</div>
                {(() => {
                  const last = commercial.auditLog[commercial.auditLog.length - 1];
                  return (
                    <div className="space-y-1 text-[12px]">
                      <div className="flex justify-between"><span className="text-slate-400">操作</span><span className={`font-semibold ${last.action === 'enable' ? 'text-green-600' : 'text-red-600'}`}>{last.action === 'enable' ? '开启' : '关闭'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">操作人</span><span>{last.operatorName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">时间</span><span>{new Date(last.time).toLocaleString('zh-CN')}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">影响模块</span><span>{last.modulesAffected.length} 个</span></div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <CommercialDisableModal
        isOpen={showCommercialModal}
        isEnableMode={commercialModalMode === 'enable'}
        onClose={() => setShowCommercialModal(false)}
        onConfirm={(modules) => {
          const isEnable = commercialModalMode === 'enable';
          if (isEnable) {
            const allModuleIds = Object.keys(COMMERCIAL_MODULES) as CommercialModuleId[];
            const keepDisabled = allModuleIds.filter((m) => !modules.includes(m));
            commercial.update(true, keepDisabled);
          } else {
            commercial.update(false, modules);
          }
          setShowCommercialModal(false);
        }}
      />
    </div>
  );
};