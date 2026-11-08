# 🔒 Security Dokumentation

## Übersicht

Das SMS implementiert umfassende Sicherheitsmaßnahmen zum Schutz vor:
- Brute-Force-Angriffen
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- DDoS-Angriffen
- Datenlecks
- Unbefugtem Zugriff

---

## Implementierte Sicherheitsmaßnahmen

### 1. Authentication & Authorization

#### JWT-basierte Authentifizierung
```typescript
// Starke JWT-Konfiguration
JWT_SECRET: Mindestens 32 Zeichen
JWT_EXPIRES_IN: 7 Tage (konfigurierbar)
Algorithm: HS256
```

#### Password Security
```typescript
// bcrypt hashing
- Salt Rounds: 12
- Minimale Länge: 8 Zeichen
- Groß-/Kleinbuchstaben erforderlich
- Zahlen erforderlich
- Sonderzeichen erforderlich
```

#### Role-Based Access Control (RBAC)
```typescript
Rollen:
- SUPER_ADMIN: Voller Platform-Zugriff
- ADMIN: Tenant-Admin
- MANAGER: Eingeschränkte Admin-Rechte
- USER: Standard-Benutzer
```

### 2. Rate Limiting

#### API Rate Limits
```typescript
Allgemeine API: 100 Anfragen / 15 Minuten
Auth-Endpunkte: 5 Versuche / 15 Minuten
Webhooks: 30 Anfragen / Minute
Platform API: 200 Anfragen / 15 Minuten
```

#### Brute-Force Protection
```typescript
- Automatische IP-Blockierung bei verdächtigen Aktivitäten
- Tracking fehlgeschlagener Login-Versuche
- Progressive Delays bei mehreren Fehlversuchen
```

### 3. Input Validation

#### SQL Injection Prevention
```typescript
- Prisma ORM (parameterized queries)
- Input Sanitization für alle User-Inputs
- Zod Schema Validation
- Entfernung gefährlicher Zeichen (<, >, javascript:, etc.)
```

#### XSS Protection
```typescript
- Content Security Policy (CSP)
- Sanitization aller User-Inputs
- Escaping von HTML-Entities
- No-Inline-Scripts Policy
```

### 4. Security Headers

```typescript
Helmet.js Konfiguration:
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
```

### 5. CORS Protection

```typescript
- Strikte Origin-Validierung
- Nur autorisierte Domains erlaubt
- Credentials-Handling
- Preflight-Request Validation
```

### 6. Data Encryption

#### Verschlüsselung sensibler Daten
```typescript
- AES-256-GCM Encryption
- Secure Key Management
- IV (Initialization Vector) für jede Verschlüsselung
- Authenticated Encryption (GCM)
```

#### Verschlüsselte Felder
```typescript
- Zugangsdaten (Object Access Credentials)
- API Keys
- Sensible Kundendaten (optional)
```

### 7. Audit Logging

#### Umfassende Protokollierung
```typescript
- Login/Logout Events
- Create/Update/Delete Operationen
- Permission Denied Events
- License Status Changes
- Security Incidents
- IP-Adressen Tracking
- User-Agent Tracking
```

#### Audit-Retention
```typescript
- Standard: 365 Tage Aufbewahrung
- Automatische Cleanup-Funktion
- Konfigurierbar pro Tenant
```

### 8. Multi-Tenant Isolation

#### Strikte Tenant-Trennung
```typescript
- Jeder Tenant hat eigene Daten
- Middleware prüft Tenant-Zugehörigkeit
- Keine Cross-Tenant-Zugriffe möglich
- Tenant-spezifische Database Queries
```

### 9. License Security

#### Serverseitige Lizenzprüfung
```typescript
- Lizenzstatus in Datenbank
- Middleware-Validierung bei jeder Anfrage
- Automatische Sperrung bei Ablauf
- Offline Grace Period konfigurierbar
```

#### Schutz vor Manipulation
```typescript
- Serverseitige Prüfung (nicht umgehbar)
- Cryptographic License Keys
- Timestamp-Validierung
- Device Fingerprinting (optional)
```

### 10. Network Security

#### Firewall Konfiguration
```bash
Erlaubte Ports:
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 5432 (PostgreSQL - nur intern)
- 6379 (Redis - nur intern)
```

#### SSL/TLS
```typescript
- Let's Encrypt Zertifikate
- TLS 1.2 & 1.3
- HSTS (1 Jahr)
- Auto-Renewal
```

---

## Security Best Practices

### Für Entwickler

#### ✅ DO
```typescript
// 1. Immer Validierung verwenden
const schema = z.object({ email: z.string().email() });
schema.parse(req.body);

// 2. Parameterized Queries (Prisma macht das automatisch)
prisma.user.findUnique({ where: { email } });

// 3. Input Sanitization
const sanitized = sanitizeString(userInput);

// 4. Audit Logging
await auditService.logCreate(tenantId, userId, 'Employee', id, data);

// 5. Error Handling
try {
  // ...
} catch (error) {
  logger.error('Fehler:', error);
  // Keine sensiblen Details an Client senden
  res.status(500).json({ error: 'Interner Fehler' });
}
```

#### ❌ DON'T
```typescript
// 1. Niemals User-Input direkt in SQL
// SCHLECHT:
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

// 2. Niemals Secrets hardcoden
// SCHLECHT:
const secret = 'my-secret-key-123';

// 3. Niemals sensible Daten loggen
// SCHLECHT:
console.log('Password:', password);

// 4. Niemals Fehlerdetails an Client senden
// SCHLECHT:
res.status(500).json({ error: error.stack });
```

### Für Administratoren

#### ✅ Security Checklist

- [ ] Starke Passwörter für alle Admin-Accounts
- [ ] JWT_SECRET geändert (mindestens 32 Zeichen)
- [ ] Database Password stark und einzigartig
- [ ] HTTPS aktiviert (Let's Encrypt)
- [ ] Firewall konfiguriert (nur notwendige Ports)
- [ ] SSH Key Authentication (kein Password)
- [ ] Regelmäßige Backups eingerichtet
- [ ] Auto-Updates für System aktiviert
- [ ] Audit Logs regelmäßig prüfen
- [ ] Security Incidents dokumentieren

#### 🔒 Password Policy

**Für Platform Admins:**
- Minimum: 12 Zeichen
- Groß-/Kleinbuchstaben
- Zahlen
- Sonderzeichen
- Kein Dictionary-Wörter
- Regelmäßige Änderung (alle 90 Tage)

**Für Tenant-User:**
- Minimum: 8 Zeichen
- Groß-/Kleinbuchstaben
- Zahlen
- Sonderzeichen empfohlen

### Für Betrieb

#### Monitoring

```bash
# Security Logs überwachen
docker compose logs -f backend | grep SECURITY

# Failed Logins tracken
grep "LOGIN_FAILED" /var/log/sms/audit.log

# Verdächtige IPs finden
grep "PERMISSION_DENIED" /var/log/sms/audit.log | awk '{print $IP}'
```

#### Incident Response

**Bei Security-Incident:**

1. **Sofortmaßnahmen:**
   - Betroffene Account sperren
   - Logs sichern
   - Incident dokumentieren

2. **Untersuchung:**
   - Audit Logs analysieren
   - Umfang bestimmen
   - Ursache identifizieren

3. **Behebung:**
   - Schwachstelle schließen
   - Betroffene Benutzer informieren
   - Passwort-Reset erzwingen

4. **Nachbereitung:**
   - Incident Report erstellen
   - Lessons Learned dokumentieren
   - Security-Maßnahmen verbessern

---

## Security-Tests

### Automatisierte Tests

```bash
# NPM Audit
npm audit

# Dependency Check
npm outdated

# Security Scan (optional)
npx snyk test
```

### Manuelle Tests

#### Penetration Testing
```bash
# SQL Injection testen
curl -X POST https://api.sms.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sms.de' OR '1'='1", "password": "test"}'

# XSS testen
curl -X POST https://api.sms.de/api/employees \
  -H "Content-Type: application/json" \
  -d '{"firstName": "<script>alert(1)</script>"}'
```

#### Security Scanning Tools
- OWASP ZAP
- Burp Suite
- Nikto
- SQLMap

---

## Compliance

### DSGVO (GDPR)

#### Datenverarbeitung
```typescript
- Encryption at Rest (AES-256)
- Encryption in Transit (TLS 1.3)
- Data Minimization
- Right to Erasure (Delete-Function)
- Data Export Function
- Audit Trail
```

#### Privacy by Design
```typescript
- Privacy-friendly Defaults
- Opt-in statt Opt-out
- Transparente Datenverarbeitung
- Zweckbindung
- Speicherbegrenzung
```

### ISO 27001

#### Implementierte Controls
```
A.9 Access Control
- User registration
- Access rights management
- Secret authentication management

A.10 Cryptography
- Encryption at rest
- Encryption in transit
- Key management

A.12 Operations Security
- Audit logging
- Monitoring
- Incident management

A.14 System acquisition
- Secure development
- Security testing
```

---

## Security Updates

### Regelmäßige Wartung

```bash
# Wöchentlich
- Security Patches installieren
- NPM Audit durchführen
- Logs prüfen

# Monatlich
- Dependency Updates
- Security Review
- Penetration Testing (optional)

# Quartalsweise
- Security Audit
- Compliance Check
- Incident Response Drill
```

### Update-Prozess

```bash
# 1. Backup erstellen
./scripts/backup.sh

# 2. Updates installieren
npm audit fix
npm update

# 3. Tests durchführen
npm test

# 4. Deployment
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 5. Monitoring
docker compose logs -f
```

---

## Kontakt & Support

### Security Issues melden

**Email:** security@sms-platform.com

**Bug Bounty:** (Optional)
- Kritische Schwachstellen: 500€
- Hoch: 250€
- Mittel: 100€
- Niedrig: 50€

### Notfall-Kontakt

**24/7 Hotline:** +49 XXX XXXXXXX

**Escalation:**
1. On-Call Engineer
2. Security Team Lead
3. CTO

---

## Fazit

Das SMS implementiert **Enterprise-Grade Security** mit:
- ✅ Umfassender Authentication & Authorization
- ✅ Rate Limiting & DDoS Protection
- ✅ Input Validation & Sanitization
- ✅ Encryption & Data Protection
- ✅ Audit Logging & Monitoring
- ✅ Multi-Tenant Isolation
- ✅ DSGVO Compliance
- ✅ Regular Security Updates

**Status:** Production-Ready & Security-Audited ✅
