
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

type StyleMapValue = string | null;
type StyleMapRecord = Record<string, StyleMapValue>;

const BARE_UPLOAD_FILENAME_RE = /^up-\d+.*$/i;

const resolveManagedUploadAbsolutePath = (resource: string): string | null => {
    if (!resource || resource.startsWith('http') || resource.startsWith('blob:') || resource.startsWith('data:')) {
        return null;
    }

    if (resource.startsWith('/uploads/')) {
        return path.resolve(process.cwd(), resource.slice(1));
    }

    if (resource.startsWith('uploads/')) {
        return path.resolve(process.cwd(), resource);
    }

    if (BARE_UPLOAD_FILENAME_RE.test(resource)) {
        return path.resolve(process.cwd(), 'uploads', resource);
    }

    return null;
};

export const uploadResourceExists = async (resource: string): Promise<boolean> => {
    const absolutePath = resolveManagedUploadAbsolutePath(resource);
    if (!absolutePath) return true;

    try {
        await fs.access(absolutePath);
        return true;
    } catch {
        return false;
    }
};

export const sanitizeStyleMap = async (
    styleMapInput: string | StyleMapRecord | null | undefined
): Promise<{ styleMap: StyleMapRecord | null; changed: boolean }> => {
    if (!styleMapInput) {
        return { styleMap: null, changed: false };
    }

    let parsed: StyleMapRecord | null = null;
    if (typeof styleMapInput === 'string') {
        try {
            parsed = JSON.parse(styleMapInput) as StyleMapRecord;
        } catch {
            return { styleMap: null, changed: false };
        }
    } else {
        parsed = { ...styleMapInput };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { styleMap: null, changed: false };
    }

    let changed = false;
    const sanitized: StyleMapRecord = { ...parsed };

    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value !== 'string' || value.length === 0) {
            continue;
        }

        const exists = await uploadResourceExists(value);
        if (!exists) {
            sanitized[key] = null;
            changed = true;
        }
    }

    return { styleMap: sanitized, changed };
};

/**
 * Converts a local file path or remote URL to a Base64 string.
 * This is crucial for passing image/file data to Gemini/OpenAI.
 */
export const resourceToBase64 = async (resource: string): Promise<string> => {
    try {
        // 1. Check if it's a remote URL
        if (resource.startsWith('http')) {
            const response = await axios.get(resource, { responseType: 'arraybuffer' });
            return Buffer.from(response.data).toString('base64');
        }

        // 2. Assume it's a local file path
        // We need to resolve it correctly. 
        // If it starts with /uploads, and we are running in server root, map it.
        // But typically resource might represent the RELATIVE URL returned by upload controller.
        // E.g. "/uploads/image.png".
        
        // Remove leading slash if present to make it relative to process.cwd()
        const relativePath = resource.startsWith('/') ? resource.slice(1) : resource;
        const absolutePath = path.resolve(process.cwd(), relativePath);

        const data = await fs.readFile(absolutePath);
        return data.toString('base64');
    } catch (error) {
        console.error("Failed to convert resource to base64:", resource, error);
        throw new Error(`Failed to process resource: ${resource}`);
    }
};

/**
 * Reads a text file from path or URL.
 */
export const readTextResource = async (resource: string): Promise<string> => {
     try {
        if (resource.startsWith('http')) {
            const response = await axios.get(resource, { responseType: 'text' });
            return response.data;
        }

        const relativePath = resource.startsWith('/') ? resource.slice(1) : resource;
        const absolutePath = path.resolve(process.cwd(), relativePath);
        return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read text resource: ${resource}`);
    }
}

/**
 * Reads a resource into a Buffer (useful for Mammoth or binary processing)
 */
export const readResourceBuffer = async (resource: string): Promise<Buffer> => {
    try {
        if (resource.startsWith('http')) {
            const response = await axios.get(resource, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        }

        const relativePath = resource.startsWith('/') ? resource.slice(1) : resource;
        const absolutePath = path.resolve(process.cwd(), relativePath);
        return await fs.readFile(absolutePath);
    } catch (error) {
        throw new Error(`Failed to read buffer resource: ${resource}`);
    }
}
