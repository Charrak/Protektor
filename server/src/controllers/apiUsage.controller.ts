import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Get API usage statistics for external developer dashboard
 */
export async function getApiUsageStats(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { period = '7d' } = req.query; // 7d, 30d, 90d

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get API usage events from audit logs
    const apiUsageEvents = await prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        action: {
          startsWith: 'API_',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Aggregate by endpoint
    const endpointStats = new Map<string, { count: number; errors: number }>();
    
    apiUsageEvents.forEach(event => {
      const endpoint = event.entityType || 'unknown';
      const stats = endpointStats.get(endpoint) || { count: 0, errors: 0 };
      
      stats.count++;
      if (event.action.includes('ERROR')) {
        stats.errors++;
      }
      
      endpointStats.set(endpoint, stats);
    });

    // Convert to array and sort by usage
    const endpoints = Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      errors: stats.errors,
      successRate: stats.count > 0 ? ((stats.count - stats.errors) / stats.count * 100).toFixed(2) : '0',
    })).sort((a, b) => b.count - a.count);

    // Calculate totals
    const totalCalls = endpoints.reduce((sum, ep) => sum + ep.count, 0);
    const totalErrors = endpoints.reduce((sum, ep) => sum + ep.errors, 0);
    const overallSuccessRate = totalCalls > 0 
      ? ((totalCalls - totalErrors) / totalCalls * 100).toFixed(2) 
      : '0';

    // Daily usage trend
    const dailyUsage = new Map<string, number>();
    apiUsageEvents.forEach(event => {
      const date = event.createdAt.toISOString().split('T')[0];
      dailyUsage.set(date, (dailyUsage.get(date) || 0) + 1);
    });

    const trend = Array.from(dailyUsage.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCalls,
        totalErrors,
        successRate: overallSuccessRate,
        uniqueEndpoints: endpoints.length,
      },
      endpoints: endpoints.slice(0, 20), // Top 20 endpoints
      trend,
    });
  } catch (error: any) {
    console.error('API usage stats error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Get API key usage
 */
export async function getApiKeyUsage(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { apiKeyId } = req.params;

    if (!apiKeyId) {
      return res.status(400).json({ error: 'API Key ID erforderlich' });
    }

    // Get API key details
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId,
      },
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API Key nicht gefunden' });
    }

    // Get usage for this API key
    const usageEvents = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: apiKeyId,
        action: {
          startsWith: 'API_',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000,
    });

    // Aggregate by endpoint
    const endpointStats = new Map<string, { count: number; lastUsed: Date }>();
    
    usageEvents.forEach(event => {
      const endpoint = event.metadata?.endpoint as string || 'unknown';
      const stats = endpointStats.get(endpoint) || { count: 0, lastUsed: event.createdAt };
      
      stats.count++;
      if (event.createdAt > stats.lastUsed) {
        stats.lastUsed = event.createdAt;
      }
      
      endpointStats.set(endpoint, stats);
    });

    const endpoints = Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      lastUsed: stats.lastUsed,
    })).sort((a, b) => b.count - a.count);

    const totalCalls = endpoints.reduce((sum, ep) => sum + ep.count, 0);

    res.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.keyHash.substring(0, 8),
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        isActive: apiKey.isActive,
      },
      summary: {
        totalCalls,
        uniqueEndpoints: endpoints.length,
      },
      endpoints: endpoints.slice(0, 20),
    });
  } catch (error: any) {
    console.error('API key usage error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}
