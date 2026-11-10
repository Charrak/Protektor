import { Router, Request, Response } from 'express';
import { supportService } from '../services/support.service';

const router = Router();

// ═══════════════════════════════════════════════════
// SUPPORT-TICKETS
// ═══════════════════════════════════════════════════

/**
 * POST /api/v1/support/tickets
 * Neues Support-Ticket erstellen
 */
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const ticket = await supportService.createTicket(tenantId, {
      userId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Ticket konnte nicht erstellt werden' });
  }
});

/**
 * GET /api/v1/support/tickets
 * Liste aller Tickets
 */
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { status, category, priority, page, limit } = req.query;

    const result = await supportService.listTickets(tenantId, {
      userId: req.query.myOnly === 'true' ? userId : undefined,
      status: status as any,
      category: category as any,
      priority: priority as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Tickets konnten nicht geladen werden' });
  }
});

/**
 * GET /api/v1/support/tickets/:id
 * Einzelnes Ticket mit Nachrichten
 */
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const ticketId = req.params.id as string;

    const ticket = await supportService.getTicket(tenantId, ticketId);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    if (error.message === 'Ticket nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Ticket konnte nicht geladen werden' });
  }
});

/**
 * GET /api/v1/support/tickets/number/:number
 * Ticket per Nummer finden
 */
router.get('/tickets/number/:number', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const ticketNumber = req.params.number as string;

    const ticket = await supportService.getTicketByNumber(tenantId, ticketNumber);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nicht gefunden' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Ticket konnte nicht geladen werden' });
  }
});

/**
 * POST /api/v1/support/tickets/:id/messages
 * Nachricht zu Ticket hinzufügen
 */
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const ticketId = req.params.id as string;

    const message = await supportService.addMessage(tenantId, {
      ticketId,
      userId,
      isAdmin: false,
      message: req.body.message,
      attachments: req.body.attachments,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    if (error.message === 'Ticket nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Nachricht konnte nicht hinzugefügt werden' });
  }
});

/**
 * PUT /api/v1/support/tickets/:id/status
 * Ticket-Status ändern
 */
router.put('/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const ticketId = req.params.id as string;
    const { status, resolution } = req.body;

    const ticket = await supportService.updateTicketStatus(tenantId, ticketId, status, resolution);
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Status konnte nicht aktualisiert werden' });
  }
});

/**
 * PUT /api/v1/support/tickets/:id/priority
 * Ticket-Priorität ändern
 */
router.put('/tickets/:id/priority', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const ticketId = req.params.id as string;
    const { priority } = req.body;

    const ticket = await supportService.updatePriority(tenantId, ticketId, priority);
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Priorität konnte nicht aktualisiert werden' });
  }
});

/**
 * PUT /api/v1/support/tickets/:id/assign
 * Ticket zuweisen
 */
router.put('/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const ticketId = req.params.id as string;
    const { assignedTo } = req.body;

    const ticket = await supportService.assignTicket(tenantId, ticketId, assignedTo);
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Ticket konnte nicht zugewiesen werden' });
  }
});

/**
 * POST /api/v1/support/tickets/:id/rate
 * Ticket bewerten
 */
router.post('/tickets/:id/rate', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const ticketId = req.params.id as string;
    const { rating } = req.body;

    const ticket = await supportService.rateTicket(tenantId, ticketId, userId, rating);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    if (error.message.includes('Bewertung')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Bewertung konnte nicht gespeichert werden' });
  }
});

/**
 * GET /api/v1/support/tickets/statistics
 * Ticket-Statistiken
 */
router.get('/tickets/statistics/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const stats = await supportService.getStatistics(tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

// ═══════════════════════════════════════════════════
// KONTAKT-ANFRAGEN
// ═══════════════════════════════════════════════════

/**
 * POST /api/v1/support/contact
 * Kontakt-Anfrage erstellen (auch öffentlich)
 */
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const request = await supportService.createContactRequest({
      ...req.body,
      tenantId,
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ error: 'Anfrage konnte nicht gesendet werden' });
  }
});

/**
 * GET /api/v1/support/contact
 * Liste aller Kontakt-Anfragen (Admin)
 */
router.get('/contact', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { status, page, limit } = req.query;

    const result = await supportService.listContactRequests(tenantId, {
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Anfragen konnten nicht geladen werden' });
  }
});

/**
 * PUT /api/v1/support/contact/:id
 * Kontakt-Anfrage bearbeiten
 */
router.put('/contact/:id', async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const requestId = req.params.id as string;
    const { status } = req.body;

    const request = await supportService.updateContactRequest(requestId, {
      status,
      processedBy: userId,
    });
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ error: 'Anfrage konnte nicht aktualisiert werden' });
  }
});

// ═══════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════

/**
 * POST /api/v1/support/feedback
 * Feedback einreichen
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    const feedback = await supportService.submitFeedback({
      tenantId,
      userId,
      feedbackType: req.body.feedbackType,
      subject: req.body.subject,
      message: req.body.message,
      context: req.body.context,
      url: req.body.url,
      rating: req.body.rating,
      userAgent: req.headers['user-agent'],
      browser: req.body.browser,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ error: 'Feedback konnte nicht gesendet werden' });
  }
});

/**
 * GET /api/v1/support/feedback
 * Liste aller Feedback-Einträge (Admin)
 */
router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { feedbackType, status, page, limit } = req.query;

    const result = await supportService.listFeedback(tenantId, {
      feedbackType: feedbackType as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Feedback konnte nicht geladen werden' });
  }
});

/**
 * GET /api/v1/support/feedback/statistics
 * Feedback-Statistiken
 */
router.get('/feedback/statistics/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const stats = await supportService.getFeedbackStatistics(tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

export default router;
