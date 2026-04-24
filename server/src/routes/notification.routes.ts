import express from 'express';
import { SnapshotService } from '../services/snapshot.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// GET /api/notifications/poll - Requires authentication
router.get('/poll', authenticate, (req, res) => {
    try {
        const notifications = SnapshotService.pollNotifications();
        res.json(notifications);
    } catch (error) {
        console.error("Poll notifications failed", error);
        res.status(500).json({ error: "Failed to poll notifications" });
    }
});

export default router;
