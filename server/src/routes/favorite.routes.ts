import express from 'express';
import { getFavorites, createFavorite, deleteFavorite } from '../controllers/favorite.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// All favorite routes require authentication
router.use(authenticate);

router.get('/', getFavorites);
router.post('/', createFavorite);
router.delete('/:id', deleteFavorite);

export default router;
