
import { StoredResource, GlobalStyleMap, PageType } from '../types';
import { uploadFile } from '../api/client';

/**
 * Ensures a resource is uploaded and returns its URL.
 * If it's already a URL string, returns it as is.
 * If it's a File, uploads it and returns the new URL.
 * If null/undefined, returns null.
 */
export const ensureUploaded = async (resource: StoredResource | null | undefined): Promise<string | null> => {
    if (!resource) return null;
    if (typeof resource === 'string') return resource;
    if (resource instanceof File) {
        try {
            console.log(`[ResourceHelper] Uploading file: ${resource.name}`);
            return await uploadFile(resource);
        } catch (error) {
            console.error('Failed to upload resource:', error);
            throw error;
        }
    }
    return null;
};

/**
 * Serializes a style map by ensuring all File objects are uploaded.
 * Returns a new style map with only URLs.
 */
export const serializeStyleMap = async (map: GlobalStyleMap): Promise<GlobalStyleMap> => {
    const result: GlobalStyleMap = { ...map };
    const keys = Object.keys(map) as PageType[];
    
    await Promise.all(keys.map(async (key) => {
        const val = map[key];
        if (val instanceof File) {
            result[key] = await ensureUploaded(val);
        }
    }));
    
    return result;
};
