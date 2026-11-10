import { Router } from 'express';
import { helpController } from '../controllers/help.controller';

const router = Router();

// Nur öffentliche GET-Routes (Auth in platform.routes.ts für Admin-Routes)
router.get('/articles', (req, res) => helpController.listArticles(req, res));
router.get('/articles/:slug', (req, res) => helpController.getArticle(req, res));
router.get('/categories', (req, res) => helpController.getCategories(req, res));
router.get('/popular', (req, res) => helpController.getPopularArticles(req, res));

// Admin-Routes (POST/PUT/DELETE) werden in platform.routes.ts eingehängt

export default router;
