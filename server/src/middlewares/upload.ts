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

// Filter? Maybe images/docs only later.
export const uploadMiddleware = multer({ storage: storage });
