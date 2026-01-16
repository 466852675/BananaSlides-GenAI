import express from 'express';
import { getFavorites, createFavorite, deleteFavorite } from '../controllers/favorite.controller';

const router = express.Router();

router.get('/', getFavorites);
router.post('/', createFavorite);
router.delete('/:id', deleteFavorite);

export default router;
