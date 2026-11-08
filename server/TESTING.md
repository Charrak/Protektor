# Testing Dokumentation

## Übersicht

Das SMS verwendet **Vitest** für Unit- und Integration-Tests.

## Test-Struktur

```
server/src/
├── services/
│   ├── __tests__/
│   │   ├── tenant.service.test.ts
│   │   ├── license.service.test.ts
│   │   └── usageTracking.service.test.ts
│   ├── tenant.service.ts
│   ├── license.service.ts
│   └── usageTracking.service.ts
```

## Tests ausführen

### Alle Tests
```bash
npm test
```

### Tests mit UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### Einzelne Test-Datei
```bash
npx vitest src/services/__tests__/tenant.service.test.ts
```

## Test-Typen

### Unit Tests
- Testen einzelne Funktionen/Methoden
- Keine externen Abhängigkeiten
- Schnell und isoliert

### Integration Tests
- Testen Zusammenspiel mehrerer Komponenten
- Verwenden Test-Datenbank
- Realistischere Szenarien

## Best Practices

1. **Test-Name**: Beschreibend und klar
   ```typescript
   it('sollte einen neuen Tenant erstellen', async () => { ... })
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange
   const input = { ... };
   
   // Act
   const result = await service.create(input);
   
   // Assert
   expect(result).toBeDefined();
   ```

3. **Cleanup**: Test-Daten nach jedem Test aufräumen
   ```typescript
   afterAll(async () => {
     await prisma.tenant.delete({ where: { id: testTenantId } });
   });
   ```

4. **Isolation**: Tests sollten unabhängig voneinander sein

## Coverage-Ziele

- **Services**: > 80%
- **Controllers**: > 70%
- **Middleware**: > 60%
- **Gesamt**: > 75%

## CI/CD Integration

Tests werden automatisch bei jedem Push ausgeführt:
```yaml
# GitHub Actions Beispiel
- name: Run tests
  run: npm run test:run

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Test-Datenbank

Tests verwenden eine separate Test-Datenbank:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sms_test
```

## Mocking

Für externe Services (Stripe, E-Mail):
```typescript
vi.mock('../services/stripe.service', () => ({
  stripeService: {
    createCheckoutSession: vi.fn().mockResolvedValue({ url: '...' }),
  },
}));
```
