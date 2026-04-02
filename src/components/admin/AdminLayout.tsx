// src/components/admin/AdminLayout.tsx
// 管理后台主布局

import React, { useState, useEffect } from 'react';
import { AdminSidebar, AdminPage } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminDashboard } from './AdminDashboard';
import { UserManagement } from './UserManagement';
import { OrderManagement } from './OrderManagement';
import { RefundManagement } from './RefundManagement';
import { LeadManagement } from './LeadManagement';
import { PointsRuleEditor } from './PointsRuleEditor';
import { RoleManagement } from './RoleManagement';
import { SystemStats } from './SystemStats';
import { AICoreEngine } from './AICoreEngine';
import { SystemSettings } from './SystemSettings';
import { GrowthCenter } from './GrowthCenter';
import { ResourceManagement } from './ResourceManagement';
import { ProfileCenter } from '../user/ProfileCenter';
import { PointsHistory } from '../user/PointsHistory';
import { InviteModal } from '../InviteModal';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
    onBack: () => void;
    initialPage?: AdminPage;
}

// 页面标题映射
const pageTitles: Record<AdminPage, { title: string; subtitle?: string }> = {
    'dashboard': { title: '控制台', subtitle: '系统概览与快捷操作' },
    'users': { title: '用户管理', subtitle: '管理所有用户账户' },
    'orders': { title: '订单管理', subtitle: '查看和管理订单' },
    'refunds': { title: '退款管理', subtitle: '审核和处理退款申请' },
    'leads': { title: '销售线索', subtitle: '企业版咨询与客户跟进' },
    'points-rules': { title: '积分规则', subtitle: '配置积分消耗规则' },
    'growth': { title: '产品管理', subtitle: '管理会员、积分商品与邀请配置' },
    'roles': { title: '角色权限', subtitle: '管理角色和权限分配' },
    'ai-engine': { title: '模型引擎', subtitle: '全局模型路由与参数配置' },
    'resources': { title: '资源管理', subtitle: '管理系统资源和孤立文件' },
    'settings': { title: '系统设置', subtitle: '系统配置项' },
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBack, initialPage }) => {
    const [currentPage, setCurrentPage] = useState<AdminPage>(initialPage || 'dashboard');
    const { isAdmin, isLoading } = useAuth();

    // Sync prop changes
    useEffect(() => {
        if (initialPage) {
            setCurrentPage(initialPage);
        }
    }, [initialPage]);

    // 用户模态框状态
    const [showProfile, setShowProfile] = useState(false);
    const [showPointsHistory, setShowPointsHistory] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    // 权限检查
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">无权限访问</h1>
                    <p className="text-slate-500 mb-6">您没有管理员权限，无法访问此页面</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-2.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }


    // 渲染当前页面内容
    const renderPageContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <SystemStats />;
            case 'users':
                return <UserManagement />;
            case 'orders':
                return <OrderManagement />;
            case 'refunds':
                return <RefundManagement />;
            case 'leads':
                return <LeadManagement />;
            case 'points-rules':
                return <PointsRuleEditor />;
            case 'growth':
                return <GrowthCenter />;
            case 'roles':
                return <RoleManagement />;
            case 'ai-engine':
                return <AICoreEngine />;
            case 'resources':
                return <ResourceManagement />;
            case 'settings':
                return <SystemSettings />;
            default:
                return <SystemStats />;
        }
    };

    const { title, subtitle } = pageTitles[currentPage];

    return (
        <div className="h-screen flex bg-slate-100">
            {/* 侧边栏 */}
            <AdminSidebar
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onBack={onBack}
            />

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* 头部 */}
                <AdminHeader
                    title={title}
                    subtitle={subtitle}
                    onBack={onBack}
                    onProfileClick={() => setShowProfile(true)}
                    onPointsClick={() => setShowPointsHistory(true)}
                    onInviteClick={() => setShowInvite(true)}
                />

                {/* 内容区 */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {renderPageContent()}
                </main>
            </div>

            {/* 用户模态框 */}
            <ProfileCenter isOpen={showProfile} onClose={() => setShowProfile(false)} />
            <PointsHistory isOpen={showPointsHistory} onClose={() => setShowPointsHistory(false)} />
            <InviteModal isOpen={showInvite} onClose={() => setShowInvite(false)} />
        </div>
    );
};

export default AdminLayout;
