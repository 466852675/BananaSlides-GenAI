import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/animations.css';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';


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
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

