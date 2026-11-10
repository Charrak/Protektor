import { prisma } from '../config/database';
import { logger } from '../config/logger';

export type TicketCategory = 'technical' | 'billing' | 'feature_request' | 'bug' | 'other';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'WAITING_FOR_SUPPORT' | 'RESOLVED' | 'CLOSED';

export interface CreateTicketInput {
  userId: string;
  category: TicketCategory;
  priority?: TicketPriority;
  subject: string;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AddMessageInput {
  ticketId: string;
  userId?: string;
  isAdmin: boolean;
  message: string;
  attachments?: any[];
}

export class SupportService {
  // ═══════════════════════════════════════════════════
  // SUPPORT-TICKETS
  // ═══════════════════════════════════════════════════

  /**
   * Erstellt ein neues Support-Ticket
   */
  async createTicket(tenantId: string, input: CreateTicketInput) {
    try {
      // Ticket-Nummer generieren
      const year = new Date().getFullYear();
      const count = await prisma.supportTicket.count({
        where: {
          tenantId,
          ticketNumber: { startsWith: `SUP-${year}-` },
        },
      });
      const ticketNumber = `SUP-${year}-${(count + 1).toString().padStart(4, '0')}`;

      const ticket = await prisma.supportTicket.create({
        data: {
          tenantId,
          userId: input.userId,
          ticketNumber,
          category: input.category,
          priority: input.priority || 'MEDIUM',
          status: 'OPEN',
          subject: input.subject,
          description: input.description,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        },
      });

      // Erste Nachricht als Beschreibung hinzufügen
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: input.userId,
          isAdmin: false,
          message: input.description,
        },
      });

      logger.info(`Support-Ticket erstellt: ${ticketNumber} von User ${input.userId}`);
      return ticket;
    } catch (error) {
      logger.error('Support-Ticket erstellen fehlgeschlagen', error);
      throw error;
    }
  }

  /**
   * Liste aller Tickets für einen Tenant
   */
  async listTickets(tenantId: string, filters: {
    userId?: string;
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    page?: number;
    limit?: number;
  }) {
    const { userId, status, category, priority, page = 1, limit = 20 } = filters;

    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Einzelnes Ticket mit allen Nachrichten
   */
  async getTicket(tenantId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket nicht gefunden');
    }

    return ticket;
  }

  /**
   * Ticket per Ticket-Nummer finden
   */
  async getTicketByNumber(tenantId: string, ticketNumber: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return ticket;
  }

  /**
   * Nachricht zu einem Ticket hinzufügen
   */
  async addMessage(tenantId: string, input: AddMessageInput) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: input.ticketId, tenantId },
    });

    if (!ticket) {
      throw new Error('Ticket nicht gefunden');
    }

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId: input.ticketId,
        userId: input.userId,
        isAdmin: input.isAdmin,
        message: input.message,
        attachments: input.attachments,
      },
    });

    // Status aktualisieren
    const newStatus = input.isAdmin ? 'WAITING_FOR_CUSTOMER' : 'WAITING_FOR_SUPPORT';
    if (ticket.status === 'OPEN' || ticket.status === 'RESOLVED') {
      await prisma.supportTicket.update({
        where: { id: input.ticketId },
        data: { status: newStatus },
      });
    }

    logger.debug(`Nachricht zu Ticket ${ticket.ticketNumber} hinzugefügt`);
    return message;
  }

  /**
   * Ticket-Status aktualisieren
   */
  async updateTicketStatus(tenantId: string, ticketId: string, status: TicketStatus, resolution?: string) {
    const updateData: any = { status };

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      if (resolution) updateData.resolution = resolution;
    }
    if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    return prisma.supportTicket.update({
      where: { id: ticketId, tenantId },
      data: updateData,
    });
  }

  /**
   * Ticket-Priorität ändern
   */
  async updatePriority(tenantId: string, ticketId: string, priority: TicketPriority) {
    return prisma.supportTicket.update({
      where: { id: ticketId, tenantId },
      data: { priority },
    });
  }

  /**
   * Ticket zuweisen
   */
  async assignTicket(tenantId: string, ticketId: string, assignedTo: string) {
    return prisma.supportTicket.update({
      where: { id: ticketId, tenantId },
      data: {
        assignedTo,
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Ticket bewerten (durch Kunden)
   */
  async rateTicket(tenantId: string, ticketId: string, userId: string, rating: number) {
    if (rating < 1 || rating > 5) {
      throw new Error('Bewertung muss zwischen 1 und 5 liegen');
    }

    return prisma.supportTicket.update({
      where: { id: ticketId, tenantId, userId },
      data: { rating },
    });
  }

  /**
   * Ticket-Statistiken
   */
  async getStatistics(tenantId: string) {
    const [total, byStatus, byPriority, byCategory, openCount, urgentCount] = await Promise.all([
      prisma.supportTicket.count({ where: { tenantId } }),
      prisma.supportTicket.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { tenantId },
        _count: { priority: true },
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: { category: true },
      }),
      prisma.supportTicket.count({ where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.supportTicket.count({ where: { tenantId, priority: 'URGENT' } }),
    ]);

    return {
      total,
      open: openCount,
      urgent: urgentCount,
      byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count.status })),
      byPriority: byPriority.map((p: any) => ({ priority: p.priority, count: p._count.priority })),
      byCategory: byCategory.map((c: any) => ({ category: c.category, count: c._count.category })),
    };
  }

  // ═══════════════════════════════════════════════════
  // KONTAKT-ANFRAGEN
  // ═══════════════════════════════════════════════════

  /**
   * Kontakt-Anfrage erstellen (auch ohne Login)
   */
  async createContactRequest(input: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    subject: string;
    message: string;
    requestType: string;
    tenantId?: string;
  }) {
    return prisma.contactRequest.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        subject: input.subject,
        message: input.message,
        requestType: input.requestType,
      },
    });
  }

  /**
   * Liste aller Kontakt-Anfragen
   */
  async listContactRequests(tenantId: string, filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;
    const where: any = {};
    
    // Wenn tenantId vorhanden, danach filtern
    // Öffentliche Anfragen (tenantId = null) können auch aufgelistet werden
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contactRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Kontakt-Anfrage bearbeiten
   */
  async updateContactRequest(id: string, data: {
    status?: string;
    processedBy?: string;
  }) {
    const updateData: any = { ...data };
    if (data.status && ['RESPONDED', 'CLOSED'].includes(data.status)) {
      updateData.processedAt = new Date();
    }

    return prisma.contactRequest.update({
      where: { id },
      data: updateData,
    });
  }

  // ═══════════════════════════════════════════════════
  // FEEDBACK
  // ═══════════════════════════════════════════════════

  /**
   * Feedback einreichen
   */
  async submitFeedback(input: {
    tenantId?: string;
    userId?: string;
    feedbackType: string;
    subject: string;
    message: string;
    context?: string;
    url?: string;
    rating?: number;
    userAgent?: string;
    browser?: string;
  }) {
    return prisma.feedback.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        feedbackType: input.feedbackType as any,
        subject: input.subject,
        message: input.message,
        context: input.context,
        url: input.url,
        rating: input.rating,
        userAgent: input.userAgent,
        browser: input.browser,
      },
    });
  }

  /**
   * Liste aller Feedback-Einträge
   */
  async listFeedback(tenantId: string, filters: {
    feedbackType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { feedbackType, status, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (feedbackType) where.feedbackType = feedbackType;
    if (status) where.status = status;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return {
      feedbacks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Feedback-Statistiken
   */
  async getFeedbackStatistics(tenantId: string) {
    const [total, byType, averageRating] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.groupBy({
        by: ['feedbackType'],
        _count: { feedbackType: true },
      }),
      prisma.feedback.aggregate({
        where: { rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    return {
      total,
      byType: byType.map((f: any) => ({ type: f.feedbackType, count: f._count.feedbackType })),
      averageRating: averageRating._avg.rating || 0,
    };
  }
}

export const supportService = new SupportService();
