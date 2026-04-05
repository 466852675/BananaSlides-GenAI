import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';
import './styles/animations.css';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 禁用窗口焦点自动刷新，避免频繁的网络请求和页面重渲染
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // 禁用窗口焦点刷新
      refetchOnReconnect: true,     // 保持网络重连刷新
      staleTime: 1000 * 60 * 5,     // 5 分钟内数据视为新鲜，不自动刷新
    },
  },
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

