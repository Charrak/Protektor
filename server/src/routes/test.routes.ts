import { Router } from 'express';
import { testController } from '../controllers/test.controller';

const router = Router();

// Debug-Routes (nur für Entwicklung)
router.get('/users', (req, res) => testController.getAllUsers(req, res));
router.post('/check-user', (req, res) => testController.checkUser(req, res));

export default router;
