import { Router } from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject, syncProjectSlides } from '../controllers/project.controller';

const router = Router();

router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', createProject);
// More specific routes must come before generic /:id route
router.patch('/:id/slides', syncProjectSlides);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
