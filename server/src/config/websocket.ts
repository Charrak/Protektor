import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from './logger';

let io: Server;

export function initWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // Namespace: /sms
  const smsNamespace = io.of('/sms');

  smsNamespace.use(async (socket: Socket, next) => {
    // Echte JWT-Authentifizierung im Handshake
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        logger.warn(`WebSocket-Verbindung abgelehnt: Kein Token`);
        return next(new Error('Authentifizierung erforderlich'));
      }

      // JWT validieren
      const jwt = (await import('jsonwebtoken')).default;
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; sessionId: string };

      // Session prüfen
      const session = await prisma.session.findFirst({
        where: {
          id: decoded.sessionId,
          userId: decoded.userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { include: { role: true } },
        },
      });

      if (!session || !session.user.isActive) {
        logger.warn(`WebSocket-Verbindung abgelehnt: Ungültige Sitzung`);
        return next(new Error('Ungültige Sitzung'));
      }

      // Socket-Daten setzen
      socket.data = {
        userId: session.userId,
        tenantId: session.user.tenantId,
        role: session.user.role.slug,
      };

      next();
    } catch (err) {
      logger.warn(`WebSocket-Verbindung abgelehnt: Ungültiger Token`);
      next(new Error('Ungültiger Token'));
    }
  });

  smsNamespace.on('connection', (socket: Socket) => {
    const { userId, tenantId, role } = socket.data;
    logger.info(`WebSocket verbunden: ${socket.id} (User: ${userId}, Tenant: ${tenantId})`);

    // Automatisch zu Rooms joinen (mandantenspezifisch)
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);
    socket.join(`role:${tenantId}:${role}`);
    socket.join('authenticated');

    // Andere Benutzer im Tenant benachrichtigen
    socket.broadcast.to(`tenant:${tenantId}`).emit('user:joined', {
      userId,
      role,
      timestamp: new Date().toISOString(),
    });

    logger.info(`WebSocket authentifiziert: User ${userId}, Tenant ${tenantId}, Rolle: ${role}`);

    socket.on('disconnect', (reason: string) => {
      logger.info(`WebSocket getrennt: ${socket.id} (${reason})`);
      smsNamespace.to(`tenant:${tenantId}`).emit('user:left', {
        userId,
        timestamp: new Date().toISOString(),
      });
    });
  });

  logger.info('WebSocket-Server initialisiert');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket-Server nicht initialisiert');
  }
  return io;
}

// Helper: Event an relevante Benutzer senden
export function broadcastToRoles(event: string, data: any, roles: string[]): void {
  if (!io) return;
  const ns = io.of('/sms');
  for (const role of roles) {
    ns.to(`role:${role}`).emit(event, data);
  }
}

export function broadcastToUser(event: string, data: any, userId: string): void {
  if (!io) return;
  io.of('/sms').to(`user:${userId}`).emit(event, data);
}

export function broadcastToAuthenticated(event: string, data: any): void {
  if (!io) return;
  io.of('/sms').to('authenticated').emit(event, data);
}

export function broadcastToResource(event: string, data: any, resourceType: string, resourceId: string): void {
  if (!io) return;
  io.of('/sms').to(`resource:${resourceType}:${resourceId}`).emit(event, data);
}
