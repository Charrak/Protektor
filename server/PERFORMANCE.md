# Performance-Optimierung

## Übersicht

Das SMS verwendet mehrere Strategien zur Performance-Optimierung:

1. **Caching**: In-Memory Cache für häufige Abfragen
2. **Compression**: gzip-Komprimierung für Responses
3. **Database Indexes**: Optimierte Datenbank-Abfragen
4. **Query Optimization**: Effiziente Prisma-Queries

## Caching

### Cache Service

```typescript
import { cacheService } from './services/cache.service';

// Daten cachen
cacheService.set('key', data, 5 * 60 * 1000); // 5 Minuten TTL

// Daten aus Cache
const data = cacheService.get('key');

// Cache invalidieren
cacheService.delete('key');
cacheService.clear(); // Alle
```

### Cache-Strategien

**Tenant-Daten**: 10 Minuten TTL
```typescript
const tenant = await cacheService.getCachedTenant(tenantId);
```

**Dashboard-Statistiken**: 5 Minuten TTL
```typescript
const stats = await cacheService.getCachedDashboardStats();
```

**Plan-Liste**: 30 Minuten TTL
```typescript
const plans = await cacheService.getCachedPlans();
```

**Employee-Liste**: 5 Minuten TTL
```typescript
const employees = await cacheService.getCachedEmployees(tenantId);
```

### Cache Invalidation

Automatische Invalidierung bei:
- POST/PUT/DELETE Requests
- Tenant-Änderungen
- Dashboard-Updates

```typescript
cacheService.invalidateTenant(tenantId);
cacheService.invalidateDashboard();
```

## Compression

### gzip-Komprimierung

Alle Responses werden automatisch komprimiert:
- Minimum Size: 1KB
- Compression Level: 6
- Filter: Alle JSON/Text Responses

### Cache-Control Headers

```http
Cache-Control: public, max-age=300
X-Cache: HIT/MISS
```

## Database Indexes

### Wichtige Indexes

**Tenants**:
- `licenseStatus` - Status-Filterung
- `createdAt` - Sortierung
- `contactEmail` - Suche

**Subscriptions**:
- `status` - Status-Filterung
- `tenantId` - Tenant-Zuordnung
- `currentPeriodEnd` - Perioden-Abfragen

**Employees**:
- `tenantId` - Tenant-Filterung
- `status` - Status-Filterung
- `email` - Eindeutigkeit
- `personnelNumber` - Suche

**Deployments**:
- `tenantId` - Tenant-Filterung
- `date` - Datums-Abfragen
- `status` - Status-Filterung

### Index-Erstellung

```bash
# Migration erstellen
npx prisma migrate dev --name add_performance_indexes

# Migration anwenden
npx prisma migrate deploy
```

## Query Optimization

### Gute Practices

✅ **Selektive Includes**
```typescript
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: {
    id: true,
    companyName: true,
    // Nur benötigte Felder
  },
});
```

✅ **Pagination**
```typescript
const tenants = await prisma.tenant.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

✅ **Batch Operations**
```typescript
await prisma.$transaction([
  prisma.employee.create({ data: {...} }),
  prisma.customer.create({ data: {...} }),
]);
```

### Schlechte Practices

❌ **N+1 Queries**
```typescript
// Schlecht: N+1 Queries
const tenants = await prisma.tenant.findMany();
for (const tenant of tenants) {
  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id }
  });
}

// Gut: Include
const tenants = await prisma.tenant.findMany({
  include: { employees: true }
});
```

❌ **Unnötige Felder**
```typescript
// Schlecht: Alle Felder
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId }
});

// Gut: Nur benötigte Felder
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { id: true, companyName: true }
});
```

## Monitoring

### Cache-Statistiken

```typescript
const stats = cacheService.getStats();
console.log(`Cache Size: ${stats.size}`);
console.log(`Cache Keys: ${stats.keys}`);
```

### Response Times

```typescript
// Middleware für Response-Time Tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

## Performance-Tuning

### Environment Variablen

```env
# Cache TTL (in Millisekunden)
CACHE_TTL_TENANT=600000
CACHE_TTL_DASHBOARD=300000
CACHE_TTL_PLANS=1800000

# Compression Level (0-9)
COMPRESSION_LEVEL=6

# Database Connection Pool
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
```

### Skalierung

**Horizontal Scaling**:
- Load Balancer vor mehreren Instanzen
- Session Affinity für WebSockets
- Shared Cache (Redis) für Multi-Instance

**Vertical Scaling**:
- Mehr RAM für größeren Cache
- Schnellere CPU für Complex Queries
- SSD für Database Performance

## Benchmarks

### Erwartete Performance

**API Response Times**:
- GET /api/platform/dashboard: < 100ms (cached)
- GET /api/tenants: < 200ms
- GET /api/employees: < 150ms
- POST /api/deployments: < 300ms

**Database Queries**:
- Simple Query: < 10ms
- Complex Query mit Includes: < 50ms
- Aggregation Queries: < 100ms

## Optimierung-Checkliste

- [ ] Database Indexes erstellt
- [ ] Caching für häufige Abfragen aktiviert
- [ ] Compression aktiviert
- [ ] N+1 Queries eliminiert
- [ ] Pagination implementiert
- [ ] Batch Operations verwendet
- [ ] Response Times monitored
- [ ] Cache Hit Rate > 80%
- [ ] Database Query Times < 100ms
