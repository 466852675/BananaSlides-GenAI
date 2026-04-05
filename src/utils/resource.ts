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
        const normalized = resource.trim();
        if (!normalized) return '';

        // Full URLs and browser-managed object/data URLs can be used as-is.
        if (
            normalized.startsWith('http://') ||
            normalized.startsWith('https://') ||
            normalized.startsWith('blob:') ||
            normalized.startsWith('data:')
        ) {
            return normalized;
        }

        // Absolute app paths are already ready to use.
        if (normalized.startsWith('/')) {
            return normalized;
        }

        // Normalize common upload storage formats.
        if (normalized.startsWith('uploads/')) {
            return `/${normalized}`;
        }

        // Some older records store only the filename (e.g. "up-123.png").
        if (!normalized.includes('/')) {
            return `/uploads/${normalized}`;
        }

        // Fallback for other relative paths.
        if (normalized.startsWith('./')) {
            return normalized.slice(1);
        }

        if (normalized.startsWith('../')) {
            return resource;
        }

        return `/${normalized}`;
    }

    return '';
};
