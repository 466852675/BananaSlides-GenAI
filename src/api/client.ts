import axios from 'axios';

// Token 存储键名
export const TOKEN_KEY = 'bananaslides_token';

/**
 * 获取 SSE 连接的 base URL
 *
 * 开发环境：通过 Vite 代理，使用相对路径（浏览器 EventSource 不支持自定义 headers）
 * 生产环境：使用 VITE_SSE_URL 环境变量，或基于当前页面 host 推算
 */
export function getSseBaseUrl(): string {
  const sseUrl = import.meta.env.VITE_SSE_URL;
  if (sseUrl) {
    return sseUrl;
  }
  // 开发环境：Vite 代理 /api -> localhost:1111，相对路径即可
  if (import.meta.env.DEV) {
    return '';
  }
  // 生产环境无配置时：基于当前页面 origin 推算（假设前后端同域或反向代理）
  return `${window.location.origin}`;
}

// Base API client
export const client = axios.create({
    baseURL: '/api', // Proxy handles forwarding to localhost:1111
    timeout: 600000, // 10 minutes (for 4K AI image generations)
    headers: {
        'Content-Type': 'application/json',
    },
});

// 是否正在刷新 token
let isRefreshing = false;
// 等待 token 刷新的请求队列
let failedQueue: { resolve: (token: string) => void; reject: (error: Error) => void }[] = [];

// 处理队列中的请求
const processQueue = (error: Error | null, token: string | null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// 🆕 请求拦截器：自动附加 Token
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
client.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;

        // 🆕 处理 401 未授权：尝试刷新 token
        if (error.response?.status === 401 && !originalRequest._retry) {
            // 如果是刷新 token 的请求本身失败了，直接登出
            if (originalRequest.url?.includes('/auth/refresh')) {
                localStorage.removeItem(TOKEN_KEY);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return Promise.reject(new Error('登录已过期，请重新登录'));
            }

            // 如果正在刷新 token，将请求加入队列等待
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return client(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // 尝试刷新 token
                const oldToken = localStorage.getItem(TOKEN_KEY);
                if (!oldToken) {
                    throw new Error('No token to refresh');
                }

                // 调用刷新接口（需要先设置旧的 token）
                const response = await axios.post('/api/auth/refresh', {}, {
                    headers: {
                        Authorization: `Bearer ${oldToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const newToken = response.data?.data?.token;
                if (!newToken) {
                    throw new Error('Failed to get new token');
                }

                // 保存新 token
                localStorage.setItem(TOKEN_KEY, newToken);

                // 处理队列中的请求
                processQueue(null, newToken);

                // 重试原始请求
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return client(originalRequest);
            } catch (refreshError) {
                // 刷新失败，清除 token 并登出
                processQueue(new Error('Token refresh failed'), null);
                localStorage.removeItem(TOKEN_KEY);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return Promise.reject(new Error('登录已过期，请重新登录'));
            } finally {
                isRefreshing = false;
            }
        }

        let message = error.response?.data?.error?.message || error.response?.data?.error || error.message;

        // 🆕 处理 401 未授权（刷新失败后的情况）
        if (error.response?.status === 401) {
            message = error.response?.data?.error?.message || '登录已过期，请重新登录';
        }

        // 🆕 处理 403 权限不足
        if (error.response?.status === 403) {
            message = error.response?.data?.error?.message || '权限不足';
        }

        // Friendly error for 502/504 (Proxy Issues)
        if (error.response?.status === 502) {
            message = "AI服务网关响应失败 (502)。请检查全局设置中的【Base URL】是否正确，或者所使用的模型服务是否支持图片生成。";
        } else if (error.response?.status === 504) {
            message = "AI服务响应超时 (504)。生成图片可能比较耗时，请稍后重试，或检查您的网络连接。";
        } else if (error.message.includes('Network Error')) {
            message = "网络连接失败。请确保后端服务 (Port 1111) 已启动。";
        }

        console.error('API Error:', message);
        return Promise.reject(new Error(message));
    }
);


/**
 * Upload a file to the backend
 * Returns the file URL (e.g. "/uploads/xyz.jpg")
 */
export const uploadFile = async (file: File, extraParams?: Record<string, string>): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => formData.append(k, v));
    }

    // axios interceptor automatically unwraps response.data
    const result = await client.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }) as unknown as any;

    // Handle new format: { url: "..." }
    if (result && typeof result.url === 'string') {
        return result.url;
    }

    // Handle old format: { success: true, data: { url: "..." } }
    if (result && result.data && typeof result.data.url === 'string') {
        return result.data.url;
    }

    // Fallback: maybe result itself is the URL string
    if (typeof result === 'string') {
        return result;
    }

    console.error('[uploadFile] Unexpected response format:', result);
    throw new Error('Upload failed: invalid response');
};
