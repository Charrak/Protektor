import { Router } from 'express';
import { helpController } from '../controllers/help.controller';

const router = Router();

// Öffentliche Help-Routes (keine Auth nötig)
router.get('/articles', (req, res) => helpController.listArticles(req, res));
router.get('/articles/:slug', (req, res) => helpController.getArticle(req, res));
router.get('/categories', (req, res) => helpController.getCategories(req, res));
router.get('/popular', (req, res) => helpController.getPopularArticles(req, res));

// Admin Help-Routes (Auth nötig - wird in platform.routes.ts eingehängt)
router.post('/articles', (req, res) => helpController.createArticle(req, res));
router.put('/articles/:id', (req, res) => helpController.updateArticle(req, res));
router.delete('/articles/:id', (req, res) => helpController.deleteArticle(req, res));

export default router;
