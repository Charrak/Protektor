# 🔌 Webhook-System

Automatische Event-Benachrichtigungen für Integrationen mit Drittsystemen.

## 📋 Übersicht

Das SMS bietet ein vollständiges Webhook-System für Echtzeit-Integrationen:

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| **Webhook-Registrierung** | URLs für Events registrieren | ✅ Implementiert |
| **Event-Ausführung** | Automatische Zustellung | ✅ Implementiert |
| **HMAC-Signatur** | Sicherheit durch Signierung | ✅ Implementiert |
| **Retry-Logik** | Automatische Wiederholung | ✅ Implementiert |
| **Delivery-Logs** | Zustellungs-Protokoll | ✅ Implementiert |
| **30+ Event-Typen** | Umfangreiche Event-Abdeckung | ✅ Implementiert |

---

## 🎯 Was sind Webhooks?

Webhooks sind HTTP-Callbacks die automatisch ausgelöst werden wenn bestimmte Events im SMS passieren.

**Beispiel:**
```
Event: Neuer Mitarbeiter erstellt
→ SMS sendet POST-Request an Ihre URL
→ Ihr System erhält alle Mitarbeiter-Daten
→ Sie können automatisch weiterverarbeiten
```

**Vorteile:**
- ✅ Echtzeit-Benachrichtigungen
- ✅ Keine Polling nötig
- ✅ Automatische Integration
- ✅ Weniger API-Aufrufe

---

## 📡 Unterstützte Events

### Mitarbeiter-Events

```
employee.created      - Neuer Mitarbeiter erstellt
employee.updated      - Mitarbeiter aktualisiert
employee.deleted      - Mitarbeiter gelöscht/deaktiviert
```

**Payload-Beispiel (employee.created):**
```json
{
  "event": "employee.created",
  "timestamp": "2026-01-08T14:30:00Z",
  "data": {
    "id": "abc-123-def",
    "firstName": "Max",
    "lastName": "Mustermann",
    "personnelNumber": "MA-001",
    "email": "max.mustermann@example.com"
  }
}
```

---

### Kunden-Events

```
customer.created      - Neuer Kunde erstellt
customer.updated      - Kunde aktualisiert
customer.deleted      - Kunde gelöscht
```

---

### Objekt-Events

```
object.created        - Neues Objekt erstellt
object.updated        - Objekt aktualisiert
object.deleted        - Objekt gelöscht
```

---

### Einsatz-Events

```
deployment.created    - Neuer Einsatz geplant
deployment.updated    - Einsatz aktualisiert
deployment.completed  - Einsatz abgeschlossen
```

---

### Zeiterfassungs-Events

```
time_record.created   - Neue Zeiterfassung
time_record.updated   - Zeiterfassung aktualisiert
time_record.approved  - Zeiterfassung genehmigt
```

---

### Abrechnungs-Events

```
invoice.created       - Neue Rechnung erstellt
invoice.paid          - Rechnung bezahlt
invoice.overdue       - Rechnung überfällig
```

---

### Dienstplan-Events

```
schedule.created      - Dienstplan erstellt
schedule.updated      - Dienstplan aktualisiert
schedule.cancelled    - Dienstplan storniert
```

---

## 🔐 Sicherheit

### HMAC-SHA256 Signatur

Jeder Webhook-Request wird mit HMAC-SHA256 signiert.

**Header:**
```
X-Webhook-Signature: sha256=a1b2c3d4e5f6...
X-Webhook-Event: employee.created
User-Agent: SMS-Webhook/1.0
```

**Verifizierung (Beispiel Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Express Example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Webhook received:', req.body);
  res.status(200).send('OK');
});
```

**Vorteile:**
- ✅ Authentifizierung (nur legitime Requests)
- ✅ Integrität (Daten nicht manipuliert)
- ✅ Sicherheit gegen Replay-Attacks

---

## 🔄 Retry-Logik

### Automatische Wiederholung

Wenn ein Webhook fehlschlägt, wird er automatisch wiederholt:

```
Versuch 1: Sofort
Versuch 2: Nach 1 Minute
Versuch 3: Nach 5 Minuten
Versuch 4: Nach 30 Minuten
Versuch 5: Nach 2 Stunden
```

**Timeout:**
- 10 Sekunden pro Versuch
- Danach wird als "failed" markiert

---

## 📊 Delivery-Logs

### Zustellungs-Protokoll

Jeder Webhook-Versuch wird protokolliert:

```
Delivery Log:
- webhookId: ID des Webhooks
- eventType: Event-Typ
- payload: Event-Daten
- responseCode: HTTP-Status-Code
- errorMessage: Fehlermeldung (falls fehlgeschlagen)
- success: Boolean (erfolgreich/fehlgeschlagen)
- createdAt: Timestamp
```

**Abfragen:**
```
GET /api/v1/webhooks/:id/deliveries
- Zeigt alle Zustellungs-Versuche
- Sortiert nach Datum (neueste zuerst)
- Max. 100 Einträge
```

---

## 🔧 Webhook registrieren

### Schritt 1: Webhook-URL erstellen

Erstellen Sie einen Endpoint in Ihrem System der POST-Requests empfangen kann:

```javascript
// Beispiel: Express.js
app.post('/sms-webhook', (req, res) => {
  const event = req.body;
  
  switch (event.event) {
    case 'employee.created':
      console.log('New employee:', event.data);
      break;
    case 'incident.created':
      console.log('New incident:', event.data);
      break;
    // ... weitere Events
  }
  
  res.status(200).send('OK');
});
```

---

### Schritt 2: Webhook im SMS registrieren

**Über API:**
```bash
POST /api/v1/webhooks
{
  "url": "https://your-system.com/sms-webhook",
  "secret": "your-secret-key",
  "events": ["employee.created", "employee.updated"],
  "isActive": true
}
```

**Über UI (zukünftig):**
```
1. Verwaltung → Webhooks
2. "Neuer Webhook" klicken
3. URL eingeben
4. Secret generieren
5. Events auswählen
6. Speichern
```

---

### Schritt 3: Webhook testen

```bash
POST /api/v1/webhooks/:id/test
```

Sendet einen Test-Event an Ihre URL:
```json
{
  "event": "webhook.test",
  "timestamp": "2026-01-08T14:30:00Z",
  "data": {
    "message": "Webhook-Test erfolgreich!"
  }
}
```

---

## 💡 Use Cases

### Use Case 1: HR-System Integration

**Szenario:** Mitarbeiter-Daten automatisch mit HR-System synchronisieren

**Ablauf:**
```
1. Mitarbeiter im SMS erstellen
   ↓
2. Webhook: employee.created
   ↓
3. HR-System empfängt Daten
   ↓
4. Automatisch in HR-System anlegen
   ↓
5. Keine doppelte Dateneingabe ✅
```

---

### Use Case 2: Incident-Alerting

**Szenario:** Bei kritischen Incidents automatisch Slack-Nachricht senden

**Ablauf:**
```
1. Incident im SMS erstellen (Schwere: CRITICAL)
   ↓
2. Webhook: incident.created
   ↓
3. Middleware prüft Schweregrad
   ↓
4. Slack-Nachricht an #alerts-Channel
   ↓
5. Team sofort informiert ✅
```

---

### Use Case 3: Buchhaltungs-Integration

**Szenario:** Rechnungen automatisch in Buchhaltungssystem übernehmen

**Ablauf:**
```
1. Rechnung im SMS erstellen
   ↓
2. Webhook: invoice.created
   ↓
3. Buchhaltungssystem empfängt Daten
   ↓
4. Automatisch in Buchhaltung anlegen
   ↓
5. Kein manueller Import nötig ✅
```

---

### Use Case 4: Business Intelligence

**Szenario:** Echtzeit-Daten für BI-Dashboard

**Ablauf:**
```
1. Events im SMS (Mitarbeiter, Einsätze, Incidents)
   ↓
2. Webhooks senden an BI-System
   ↓
3. BI-System aktualisiert Dashboard
   ↓
4. Echtzeit-Einblicke ✅
```

---

### Use Case 5: Compliance-Reporting

**Szenario:** Automatische Compliance-Berichte erstellen

**Ablauf:**
```
1. Compliance-relevante Events (Incidents, Zugriffe)
   ↓
2. Webhooks an Compliance-System
   ↓
3. Automatische Berichterstellung
   ↓
4. Immer aktuelle Reports ✅
```

---

## 📋 Best Practices

### Webhook-Endpoint

```
✅ Immer 200 OK zurückgeben (auch bei Fehlern)
✅ Schnell verarbeiten (< 5 Sekunden)
✅ Async processing für lange Tasks
✅ Idempotent designen (mehrfache Ausführung OK)
✅ Signature verifizieren
✅ Fehler loggen
```

**Beispiel:**
```javascript
app.post('/webhook', async (req, res) => {
  // 1. Signature verifizieren
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // 2. Sofort 200 OK zurückgeben
  res.status(200).send('OK');
  
  // 3. Async verarbeiten
  try {
    await processWebhook(req.body);
  } catch (error) {
    // Fehler loggen, aber nicht an SMS zurückgeben
    console.error('Webhook processing error:', error);
  }
});
```

---

### Security

```
✅ Starke Secrets verwenden (min. 32 Zeichen)
✅ HTTPS nur (keine HTTP-URLs)
✅ Signature immer verifizieren
✅ IP-Whitelist (optional)
✅ Rate Limiting implementieren
✅ Webhook-Secrets rotieren
```

---

### Error Handling

```
✅ Retry-Logik implementieren (SMS macht das automatisch)
✅ Dead Letter Queue für permanente Fehler
✅ Alerting bei wiederholten Fehlern
✅ Monitoring einrichten
```

---

## 🔍 Troubleshooting

### Webhook kommt nicht an

**Checkliste:**
```
□ URL erreichbar? (curl -I https://your-url.com)
□ Firewall erlaubt POST-Requests?
□ HTTPS-Zertifikat gültig?
□ Webhook aktiv? (isActive: true)
□ Event abonniert?
□ Signature korrekt?
```

**Debugging:**
```bash
# Webhook-Logs prüfen
GET /api/v1/webhooks/:id/deliveries

# Test-Webhook senden
POST /api/v1/webhooks/:id/test

# Webhook-Status prüfen
GET /api/v1/webhooks/:id
```

---

### Signature-Verifizierung fehlgeschlagen

**Häufige Fehler:**
```
❌ Secret falsch kopiert
❌ Payload nicht als JSON stringifiziert
❌ Encoding-Fehler (UTF-8)
❌ Timing-Attacke (nicht timing-safe compare)
```

**Lösung:**
```javascript
// Richtige Verifizierung
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}
```

---

### Webhook zu langsam

**Problem:** SMS timeout nach 10 Sekunden

**Lösung:**
```javascript
// Sofort 200 OK zurückgeben
app.post('/webhook', (req, res) => {
  res.status(200).send('OK'); // Sofort!
  
  // Dann async verarbeiten
  processWebhookAsync(req.body);
});
```

---

## 📊 API-Endpunkte

### Webhook-Verwaltung

```
POST   /api/v1/webhooks              - Webhook registrieren
GET    /api/v1/webhooks              - Alle Webhooks auflisten
GET    /api/v1/webhooks/:id          - Webhook-Details
PUT    /api/v1/webhooks/:id          - Webhook aktualisieren
DELETE /api/v1/webhooks/:id          - Webhook löschen
POST   /api/v1/webhooks/:id/test     - Test-Webhook senden
GET    /api/v1/webhooks/:id/deliveries - Delivery-Logs
```

---

## 🎓 Beispiele

### Node.js (Express)

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(payload, signature) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  console.log(`Received ${event}:`, data);
  
  // Process based on event type
  switch (event) {
    case 'employee.created':
      // Handle new employee
      break;
    case 'incident.created':
      // Handle new incident
      break;
    // ... more cases
  }
  
  res.status(200).send('OK');
});

app.listen(3000);
```

---

### Python (Flask)

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = 'your-secret-key'

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature.replace('sha256=', ''), expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    
    if not verify_signature(request.data.decode(), signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    data = request.json
    event = data.get('event')
    
    print(f"Received {event}: {data}")
    
    # Process event
    if event == 'employee.created':
        # Handle new employee
        pass
    
    return jsonify({'status': 'OK'}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

---

## 📚 Verwandte Dokumentation

- [Customer API](CUSTOMER-API.md)
- [Admin-Handbuch](ADMIN-HANDBUCH.md)
- [API-Endpunkte](api/01-API-ENDPUNKTE.md)

---

**Phase 35: ✅ Vollständig implementiert**

**Webhook-System für Echtzeit-Integrationen!** 🔌

© 2026 SMS Security Management System
