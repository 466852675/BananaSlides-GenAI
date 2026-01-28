import axios from 'axios';

// Token 存储键名
export const TOKEN_KEY = 'bananaslides_token';

// Base API client
export const client = axios.create({
    baseURL: '/api', // Proxy handles forwarding to localhost:1111
    timeout: 600000, // 10 minutes (for 4K AI image generations)
    headers: {
        'Content-Type': 'application/json',
    },
});

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
    (error) => {
        let message = error.response?.data?.error?.message || error.response?.data?.error || error.message;

        // 🆕 处理 401 未授权：自动清除 Token 并触发登出事件
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new CustomEvent('auth:logout'));
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
export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

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
