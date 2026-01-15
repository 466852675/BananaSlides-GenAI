import { Router } from 'express';
import { snapshotController } from '../controllers/snapshot.controller';

const router = Router();

router.post('/projects/:projectId/snapshots', snapshotController.create);
router.get('/projects/:projectId/snapshots', snapshotController.findAll);
router.get('/snapshots/:snapshotId', snapshotController.getOne);
router.post('/snapshots/:snapshotId/restore', snapshotController.restore);
router.delete('/snapshots/:snapshotId', snapshotController.delete);

export default router;
