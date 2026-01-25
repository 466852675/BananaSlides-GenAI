import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/animations.css';
import { AuthProvider } from './contexts/AuthContext';
import { LoginModal } from './components/auth';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <LoginModal />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

