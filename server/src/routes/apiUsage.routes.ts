import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getApiUsageStats, getApiKeyUsage } from '../controllers/apiUsage.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get API usage statistics
router.get('/usage', getApiUsageStats);

// Get specific API key usage
router.get('/usage/:apiKeyId', getApiKeyUsage);

export default router;
