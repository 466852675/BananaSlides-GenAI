import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 1000,
        host: '127.0.0.1',
        // 忽略不需要触发页面重载的文件变化
        // - .omc: oh-my-claudecode 状态文件
        // - AGENTS.md: AI 代理配置文档
        // - CLAUDE.md: Claude 指令文档
        // - docs/: 文档目录
        // - server/: 后端代码目录
        // - AI实用化应用大赛/: 大赛相关文件
        watch: {
          ignored: [
            // IDE/编辑器配置
            '**/.vscode/**',
            '**/.idea/**',
            '**/.obsidian/**',
            // AI 工具配置和状态
            '**/.claude/**',
            '**/.claudian/**',
            '**/.omc/**',
            '**/.opencode/**',
            '**/.sisyphus/**',
            '**/.trae/**',
            // 测试和自动化工具
            '**/.playwright-mcp/**',
            '**/playwright-report/**',
            '**/test-results/**',
            // 文档和配置
            '**/AGENTS.md',
            '**/CLAUDE.md',
            '**/docs/**',
            '**/.workbuddy/**',
            '**/server/**',
            '**/AI实用化应用大赛/**',
            // 图片和静态资源
            '**/*.png',
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.gif',
            '**/*.webp',
            '**/*.svg',
            '**/*.ico',
            // 临时文件和配置
            'config.json',
            'config.local.json',
            '**/*.log',
            '**/*.tmp'
          ]
        },
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:1111',
            changeOrigin: true,
            // 支持 SSE (EventSource) 长连接代理
            configure: (proxy) => {
              proxy.on('proxyRes', (proxyRes) => {
                // SSE 响应需要禁用缓冲
                if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                  proxyRes.headers['cache-control'] = 'no-cache';
                  proxyRes.headers['connection'] = 'keep-alive';
                  delete proxyRes.headers['x-accel-buffering'];
                }
              });
            }
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
          },
          // WebSocket 代理 - 通过 Vite 代理连接，避免跨端口不稳定问题
          '/ws': {
            target: 'ws://127.0.0.1:1111',
            ws: true,  // 启用 WebSocket 代理
            changeOrigin: true
          }
        }
      },
      plugins: [react(), tailwindcss()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }

              const normalized = id.split('\\').join('/');

              if (normalized.includes('/node_modules/react-dom/')) {
                return 'vendor-react-dom';
              }

              if (normalized.includes('/node_modules/react/')) {
                return 'vendor-react';
              }

              if (normalized.includes('/node_modules/recharts/')) {
                return 'vendor-recharts';
              }

              if (normalized.includes('/node_modules/jspdf/')) {
                return 'vendor-jspdf';
              }

              if (normalized.includes('/node_modules/pptxgenjs/')) {
                return 'vendor-pptxgenjs';
              }

              if (normalized.includes('/node_modules/html2canvas/')) {
                return 'vendor-html2canvas';
              }

              if (normalized.includes('/node_modules/jszip/')) {
                return 'vendor-jszip';
              }

              if (normalized.includes('/node_modules/framer-motion/') || normalized.includes('/node_modules/motion-dom/')) {
                return 'vendor-motion';
              }

              if (normalized.includes('/node_modules/lucide-react/')) {
                return 'vendor-lucide';
              }

              if (normalized.includes('/node_modules/mammoth/')) {
                return 'vendor-mammoth';
              }

              return undefined;
            }
          }
        }
      },
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
