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

Integrationstests schreiben Datensätze und sind daher standardmäßig gegen jede Datenbank gesperrt, die nicht ausdrücklich als Testdatenbank konfiguriert ist. Verwende eine separate, entbehrliche Datenbank mit einem Namen, der auf `_test` endet (zum Beispiel `sms_test`):

```bash
NODE_ENV=test TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/sms_test npm test
```

`TEST_DATABASE_URL` ist erforderlich; eine normale Anwendungs-`DATABASE_URL` wird von den Tests nicht übernommen. Niemals gegen die Produktionsdatenbank testen.

## Auf einem VPS testen, ohne den Live-Stack zu berühren

Für manuelle Browser-/API-Tests gibt es im Repository `docker-compose.test.yml`. Es verwendet einen separaten Compose-Projektnamen, eine eigene PostgreSQL-Datenbank und eigene Volumes; alle Host-Ports sind an `127.0.0.1` gebunden. Auf einem VPS mit bereits vorhandenem Checkout zuerst **in ein neues Verzeichnis klonen** — nicht den bestehenden Ordner mit lokalen Änderungen überschreiben:

```bash
git clone --single-branch --branch arena/0230ac3a-protektor \
  https://github.com/Charrak/Protektor.git ~/Protektor-verify
cd ~/Protektor-verify
COMPOSE='docker compose -p protektor-verify -f docker-compose.test.yml'
$COMPOSE build
$COMPOSE run --rm backend npx prisma db push
$COMPOSE run --rm backend npm run seed
$COMPOSE up -d
```

Der Test-Stack nutzt absichtlich `prisma db push` statt `migrate deploy`: Das vorhandene `0_init/migration.sql` ist leer, während spätere Migrationen bereits Tabellen wie `tenants` voraussetzen. Deshalb schlägt `migrate deploy` auf einer leeren Datenbank fehl. `db push` ist hier ausschließlich für die projektisolierte, entbehrliche Testdatenbank gedacht und **kein** Ersatz für eine reparierte Produktions-Migrationshistorie.

Nach dem Basis-Seed können die Zeiterfassungsfixtures angelegt werden:

```bash
$COMPOSE run --rm backend npm run seed:time-tracking-demo
```

Das Seed-Script verweigert Datenbanknamen ohne `_test`/`-test`-Suffix und legt idempotent zwei Objekte, Schichten, Zeiteinträge mit Status von offen bis storniert, Pausen, Korrekturen, Audit-Ereignisse sowie objektbezogene Disponentenrechte an.

Nur für diese isolierte Testinstanz:
- Admin: Mandant `DEMO-001`, Benutzer `demo`, Passwort `Demo123!`
- Mitarbeiter: Mandant `DEMO-001`, Benutzer `max`, Passwort `Mitarbeiter123!`
- Disponent: Mandant `DEMO-001`, Benutzer `disponent`, Passwort `Mitarbeiter123!` (nur Objekt `OBJ-DEMO-001`)

Diese Seed-Zugangsdaten nicht öffentlich freigeben oder für produktive Instanzen verwenden.

Für den Browser über SSH tunneln: `ssh -L 53000:127.0.0.1:53000 ubuntu@<server>` und dann lokal `http://localhost:53000` öffnen. Die Integrationstests laufen mit einer **zweiten, separaten** PostgreSQL-Datenbank:

```bash
docker compose -p protektor-verify -f docker-compose.test.yml \
  --profile integration run --rm integration-tests
```

Zum Stoppen ohne Löschen der Testdaten: `docker compose -p protektor-verify -f docker-compose.test.yml down`. **Nicht** `down -v` verwenden, wenn die Testdaten erhalten bleiben sollen.

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
