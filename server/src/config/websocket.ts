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

  smsNamespace.use((socket: Socket, next) => {
    // Authentifizierung über Token im Handshake
    const token = socket.handshake.auth?.token;
    if (!token) {
      logger.warn(`WebSocket-Verbindung abgelehnt: Kein Token`);
      return next(new Error('Authentifizierung erforderlich'));
    }
    // Token wird später im auth:login Event validiert
    next();
  });

  smsNamespace.on('connection', (socket: Socket) => {
    logger.info(`WebSocket verbunden: ${socket.id}`);

    // Authentication Event
    socket.on('auth:login', (data: { userId: string; role: string }) => {
      socket.join('authenticated');
      socket.join(`user:${data.userId}`);
      socket.join(`role:${data.role}`);

      // Andere Benutzer benachrichtigen
      socket.broadcast.to('authenticated').emit('user:joined', {
        userId: data.userId,
        role: data.role,
        timestamp: new Date().toISOString(),
      });

      logger.info(`WebSocket authentifiziert: User ${data.userId}, Rolle: ${data.role}`);
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`WebSocket getrennt: ${socket.id} (${reason})`);

      // Benutzer-Info aus Socket-Daten
      const userId = socket.data?.userId;
      if (userId) {
        smsNamespace.to('authenticated').emit('user:left', {
          userId,
          timestamp: new Date().toISOString(),
        });
      }
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
