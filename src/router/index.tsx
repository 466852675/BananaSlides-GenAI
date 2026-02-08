import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { PrivateRoute, AdminRoute, SuperAdminRoute, PublicRoute } from './guards';

// 页面组件懒加载
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const EditorPage = lazy(() => import('../pages/EditorPage'));

// 管理后台页面
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const OrderManagement = lazy(() => import('../pages/admin/OrderManagement'));
const PointsRulesManagement = lazy(() => import('../pages/admin/PointsRulesManagement'));
const ProductManagement = lazy(() => import('../pages/admin/ProductManagement'));
const AIEngineManagement = lazy(() => import('../pages/admin/AIEngineManagement'));
const RefundManagement = lazy(() => import('../pages/admin/RefundManagement'));
const RoleManagement = lazy(() => import('../pages/admin/RoleManagement'));
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'));
const OperationLogPage = lazy(() => import('../pages/admin/OperationLogPage'));

// 加载中组件
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

const AppRoutes: React.FC = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* 公开路由 */}
                <Route path="/" element={<LandingPage />} />
                <Route 
                    path="/login" 
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    } 
                />

                {/* 需要登录的路由 */}
                <Route 
                    path="/dashboard" 
                    element={
                        <PrivateRoute>
                            <DashboardPage />
                        </PrivateRoute>
                    } 
                />
                <Route 
                    path="/editor/:projectId" 
                    element={
                        <PrivateRoute>
                            <EditorPage />
                        </PrivateRoute>
                    } 
                />

                {/* 管理后台路由 */}
                <Route 
                    path="/admin" 
                    element={
                        <AdminRoute>
                            <AdminLayout />
                        </AdminRoute>
                    }
                >
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="orders" element={<OrderManagement />} />
                    <Route path="points-rules" element={<PointsRulesManagement />} />
                    <Route path="products" element={<ProductManagement />} />
                    <Route path="refunds" element={<RefundManagement />} />
                    <Route path="roles" element={<RoleManagement />} />
                    
                    {/* 超级管理员专属路由 */}
                    <Route 
                        path="ai-engine" 
                        element={
                            <SuperAdminRoute>
                                <AIEngineManagement />
                            </SuperAdminRoute>
                        } 
                    />
                    <Route 
                        path="audit-logs" 
                        element={
                            <SuperAdminRoute>
                                <AuditLogPage />
                            </SuperAdminRoute>
                        } 
                    />
                    <Route 
                        path="operation-logs" 
                        element={
                            <SuperAdminRoute>
                                <OperationLogPage />
                            </SuperAdminRoute>
                        } 
                    />
                </Route>

                {/* 404页面 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
};

// 404页面
const NotFoundPage: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600 mb-8">页面未找到</p>
        <a href="/" className="text-blue-600 hover:text-blue-800">
            返回首页
        </a>
    </div>
);

export default AppRoutes;
