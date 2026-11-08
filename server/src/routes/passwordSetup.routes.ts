import { Router } from 'express';
import { validateSetupToken, setPassword } from '../controllers/passwordSetup.controller';

const router = Router();

// Validate setup token
router.get('/validate', validateSetupToken);

// Set new password
router.post('/set-password', setPassword);

export default router;
