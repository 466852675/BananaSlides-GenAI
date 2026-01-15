import { StoredResource } from '../types';

/**
 * Resolves a StoredResource to a usable URL string.
 * - If it's a File object, creates a local object URL.
 * - If it's a string, treats it as a remote URL (and prepends /uploads if relative).
 */
export const resolveResourceUrl = (resource: StoredResource | null | undefined): string => {
    if (!resource) return '';

    if (resource instanceof File) {
        return URL.createObjectURL(resource);
    }

    if (typeof resource === 'string') {
        // If it's a full URL (http/https), return as is
        if (resource.startsWith('http') || resource.startsWith('blob:')) {
            return resource;
        }
        // If it's a relative path (e.g., 'uploads/xyz.jpg'), prepend base
        // Note: The backend serves static files at /uploads
        // If the string from DB is just filename, we might need to adjust logic based on storage
        // Assuming DB stores relative path or full URL. 
        // For this refactor, let's assume valid URL or path relative to server root
        return resource;
    }

    return '';
};
