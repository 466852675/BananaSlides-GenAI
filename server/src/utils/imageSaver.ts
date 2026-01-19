
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Ensures the upload directory exists.
 */
const ensureUploadDir = () => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'generated');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};

/**
 * Saves a Base64 image string to the file system.
 * @param base64Data The full base64 string (can include data:image/... prefix or not)
 * @param prefix Optional prefix for the filename
 * @returns The relative URL path to the saved image (e.g., "/uploads/generated/abc.png")
 */
export const saveBase64Image = async (base64Data: string, prefix: string = 'img'): Promise<string> => {
    try {
        // Strip metadata prefix if present
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

        // Generate unique filename
        const hash = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const filename = `${prefix}_${timestamp}_${hash}.png`;

        const uploadDir = ensureUploadDir();
        const filePath = path.join(uploadDir, filename);

        // Write file
        await fs.promises.writeFile(filePath, base64Image, 'base64');

        // Return relative URL
        return `/uploads/generated/${filename}`;
    } catch (error) {
        console.error('[ImageSaver] Failed to save image:', error);
        throw error;
    }
};

/**
 * Checks if a string is a Base64 image.
 */
export const isBase64Image = (str: string): boolean => {
    return typeof str === 'string' && str.startsWith('data:image');
};
