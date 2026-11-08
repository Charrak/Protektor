import { Router } from 'express';
import { developerSettingsController } from '../controllers/developerSettings.controller';
import { apiKeyController } from '../controllers/apiKey.controller';
import { bankController } from '../controllers/bank.controller';
import { pdfExportController } from '../services/pdfExport.service';
import { platformAuthenticate } from '../middleware/platformAuth';

const router = Router();

// Alle Developer-Routes erfordern Platform-Auth
router.use(platformAuthenticate);

// System-Einstellungen
router.get('/settings', (req, res) => developerSettingsController.getSettings(req, res));
router.put('/settings', (req, res) => developerSettingsController.updateSettings(req, res));
router.post('/settings/reset', (req, res) => developerSettingsController.resetToDefaults(req, res));
router.post('/test-connection', (req, res) => developerSettingsController.testConnection(req, res));

// API-Keys
router.get('/api-keys', (req, res) => apiKeyController.listApiKeys(req, res));
router.post('/api-keys', (req, res) => apiKeyController.createApiKey(req, res));
router.delete('/api-keys/:id', (req, res) => apiKeyController.deleteApiKey(req, res));
router.put('/api-keys/:id/toggle', (req, res) => apiKeyController.toggleApiKey(req, res));

// Bank-Verbindungen
router.get('/bank-connections', (req, res) => bankController.listBankConnections(req, res));
router.post('/bank-connections', (req, res) => bankController.createBankConnection(req, res));
router.delete('/bank-connections/:id', (req, res) => bankController.deleteBankConnection(req, res));

// SEPA
router.get('/sepa-mandates', (req, res) => bankController.listSepaMandates(req, res));
router.post('/sepa/execute-direct-debit', (req, res) => bankController.executeDirectDebit(req, res));
router.post('/sepa/batch-collect', (req, res) => bankController.batchCollect(req, res));

// PDF Export
router.post('/export/pdf', (req, res) => pdfExportController.exportPdf(req, res));

export default router;
