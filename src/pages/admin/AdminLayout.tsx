import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">管理后台</h1>
                </div>
            </header>
            <div className="flex">
                <nav className="w-64 bg-white min-h-screen shadow">
                    <ul className="p-4 space-y-2">
                        <li><Link to="/admin" className="block p-2 hover:bg-gray-100 rounded">概览</Link></li>
                        <li><Link to="/admin/users" className="block p-2 hover:bg-gray-100 rounded">用户管理</Link></li>
                        <li><Link to="/admin/orders" className="block p-2 hover:bg-gray-100 rounded">订单管理</Link></li>
                        <li><Link to="/admin/points-rules" className="block p-2 hover:bg-gray-100 rounded">积分规则</Link></li>
                        <li><Link to="/admin/products" className="block p-2 hover:bg-gray-100 rounded">商品管理</Link></li>
                        <li><Link to="/admin/refunds" className="block p-2 hover:bg-gray-100 rounded">退款管理</Link></li>
                        <li><Link to="/admin/roles" className="block p-2 hover:bg-gray-100 rounded">角色权限</Link></li>
                        <li><Link to="/admin/ai-engine" className="block p-2 hover:bg-gray-100 rounded">AI引擎</Link></li>
                        <li><Link to="/admin/audit-logs" className="block p-2 hover:bg-gray-100 rounded">审计日志</Link></li>
                    </ul>
                </nav>
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
