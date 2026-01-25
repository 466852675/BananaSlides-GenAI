import { Router } from 'express';
import { snapshotController } from '../controllers/snapshot.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All snapshot routes require authentication
router.use(authenticate);

router.post('/projects/:projectId/snapshots', snapshotController.create);
router.get('/projects/:projectId/snapshots', snapshotController.findAll);
router.get('/snapshots/:snapshotId', snapshotController.getOne);
router.post('/snapshots/:snapshotId/restore', snapshotController.restore);
router.delete('/snapshots/:snapshotId', snapshotController.delete);

export default router;
