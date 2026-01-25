import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads dir exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Unique filename: timestamp + random + ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.png'; // Fallback ext
        cb(null, 'up-' + uniqueSuffix + ext);
    }
});

const allowedMimeTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
]);

const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.txt']);

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new Error('UNSUPPORTED_FILE_TYPE'));
        return;
    }
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (ext && !allowedExt.has(ext)) {
        cb(new Error('UNSUPPORTED_FILE_EXTENSION'));
        return;
    }
    cb(null, true);
};

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});
