import axios from 'axios';

// Base API client
export const client = axios.create({
    baseURL: '/api', // Proxy handles forwarding to localhost:1111
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
client.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.error || error.message;
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
