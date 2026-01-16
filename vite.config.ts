import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 1000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:1111',
            changeOrigin: true
          },
          '/uploads': {
            target: 'http://127.0.0.1:1111',
            changeOrigin: true
          },
          '/mineru-proxy': {
            target: 'https://mineru.net',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mineru-proxy/, '')
          },
          '/mineru-oss-proxy': {
            target: 'https://mineru.oss-cn-shanghai.aliyuncs.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mineru-oss-proxy/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
