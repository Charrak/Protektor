import { Router } from 'express';
import { externalApiController, externalApiAuth } from '../controllers/externalApi.controller';

const router = Router();

// Alle External API Routes benötigen API-Key Auth
router.use(externalApiAuth);

// API-Key Info
router.get('/me', (req, res) => externalApiController.getMe(req, res));

// Mitarbeiter
router.get('/employees', (req, res) => externalApiController.listEmployees(req, res));
router.post('/employees', (req, res) => externalApiController.createEmployee(req, res));

// Kunden
router.get('/customers', (req, res) => externalApiController.listCustomers(req, res));
router.post('/customers', (req, res) => externalApiController.createCustomer(req, res));

// Objekte
router.get('/objects', (req, res) => externalApiController.listObjects(req, res));

// Einsätze
router.get('/deployments', (req, res) => externalApiController.listDeployments(req, res));

// Zeiterfassung
router.post('/time-entries', (req, res) => externalApiController.createTimeEntry(req, res));

// Webhooks
router.get('/webhooks', (req, res) => externalApiController.listWebhooks(req, res));
router.post('/webhooks', (req, res) => externalApiController.registerWebhook(req, res));

export default router;
