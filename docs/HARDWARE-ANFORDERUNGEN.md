# Hardware-Anforderungen für SMS Server

## Übersicht

Das SMS Security Management System ist sehr ressourceneffizient und läuft auf verschiedenster Hardware - vom Raspberry Pi bis zum Enterprise-Server.

---

## Mindestanforderungen

### Absolute Minimum (Test/Development)
```
CPU: 2 Kerne (Intel/AMD/ARM)
RAM: 2 GB
Storage: 20 GB SSD
OS: Linux (Ubuntu 20.04+), Windows 10+, macOS
Docker: 20.10+
```

**Geeignet für:**
- Entwicklung & Tests
- Demo-Umgebungen
- Bis zu 5 gleichzeitige Benutzer

---

## Empfohlene Konfigurationen

### Szenario 1: Kleines Sicherheitsunternehmen (10-30 MA, 1-3 Tenants)

**Hardware:**
```
CPU: 4 Kerne (Intel i5/i7 oder AMD Ryzen 5/7)
RAM: 8 GB
Storage: 256 GB SSD (NVMe empfohlen)
Netzwerk: 100 Mbit/s
OS: Ubuntu Server 22.04 LTS oder Debian 12
```

**Beispiel-Hardware:**
- **Mini-PC:** Intel N100, 8GB RAM, 256GB SSD (~200-300€)
- **Raspberry Pi 5:** 8GB RAM + 256GB SSD (~150-200€)
- **Used Server:** Dell OptiPlex/HP EliteDesk (~150-250€)

**Performance:**
- Response-Zeit: <100ms
- Gleichzeitige Benutzer: 10-20
- Datenbank-Größe: Bis 10 GB

---

### Szenario 2: Mittleres Unternehmen (30-100 MA, 3-10 Tenants)

**Hardware:**
```
CPU: 6-8 Kerne (Intel i7/i9 oder AMD Ryzen 7/9)
RAM: 16-32 GB
Storage: 512 GB - 1 TB SSD (NVMe)
Netzwerk: 1 Gbit/s
OS: Ubuntu Server 22.04 LTS
Backup: Externe HDD oder NAS
```

**Beispiel-Hardware:**
- **Server:** Dell PowerEdge T340 (~800-1200€)
- **Mini-Server:** Intel NUC 11 Pro (~600-900€)
- **Synology NAS:** DS920+ mit Docker (~500-700€)

**Performance:**
- Response-Zeit: <50ms
- Gleichzeitige Benutzer: 30-50
- Datenbank-Größe: Bis 50 GB

---

### Szenario 3: Großes Unternehmen (100-500 MA, 10-50 Tenants)

**Hardware:**
```
CPU: 8-16 Kerne (Intel Xeon oder AMD EPYC)
RAM: 64-128 GB
Storage: 2 TB SSD (RAID 1 oder RAID 10)
Netzwerk: 10 Gbit/s
OS: Ubuntu Server 22.04 LTS oder RHEL 9
Backup: Tägliches Backup auf separates NAS
```

**Beispiel-Hardware:**
- **Server:** Dell PowerEdge R740 (~3000-5000€)
- **Server:** HP ProLiant DL380 (~3500-6000€)
- **Custom Build:** AMD EPYC + ECC RAM (~2500-4000€)

**Performance:**
- Response-Zeit: <20ms
- Gleichzeitige Benutzer: 100-200
- Datenbank-Größe: Bis 500 GB

---

### Szenario 4: Enterprise (500+ MA, 50+ Tenants)

**Hardware:**
```
CPU: 2x 16+ Kerne (Intel Xeon Gold/Platinum oder AMD EPYC)
RAM: 256-512 GB
Storage: 4-8 TB SSD (RAID 10) + 20 TB HDD (Backup)
Netzwerk: 25/40 Gbit/s
OS: RHEL 9 oder Ubuntu Server 22.04 LTS
Cluster: 2+ Server für Hochverfügbarkeit
Load Balancer: nginx HAProxy
```

**Beispiel-Hardware:**
- **Cluster:** 2x Dell PowerEdge R750 (~8000-12000€ pro Server)
- **SAN Storage:** NetApp/Dell EMC (~10000-20000€)
- **Total:** 25000-50000€

**Performance:**
- Response-Zeit: <10ms
- Gleichzeitige Benutzer: 500+
- Datenbank-Größe: 1+ TB
- Verfügbarkeit: 99.9%

---

## Cloud-Optionen

### Option 1: VPS (Virtual Private Server)

**Anbieter & Preise:**

| Anbieter | RAM | CPU | Storage | Preis/Monat |
|----------|-----|-----|---------|-------------|
| Hetzner CX22 | 4 GB | 2 vCPU | 40 GB | 4.51€ |
| Hetzner CX32 | 8 GB | 4 vCPU | 80 GB | 8.91€ |
| Hetzner CX42 | 16 GB | 8 vCPU | 160 GB | 17.11€ |
| DigitalOcean | 8 GB | 4 vCPU | 160 GB | 48$ |
| AWS t3.large | 8 GB | 2 vCPU | 125 GB | ~80$ |
| Azure B4ms | 16 GB | 4 vCPU | 128 GB | ~120$ |

**Empfehlung:**
- Klein: Hetzner CX22 (4.51€/Monat)
- Mittel: Hetzner CX32 (8.91€/Monat)
- Groß: Hetzner CX42 (17.11€/Monat)

**Vorteile:**
- Keine Hardware-Wartung
- Automatische Backups
- Skalierbar
- Hohe Verfügbarkeit

**Nachteile:**
- Laufende Kosten
- Daten im Rechenzentrum
- Abhängigkeit vom Anbieter

---

### Option 2: Dedicated Server

**Anbieter & Preise:**

| Anbieter | RAM | CPU | Storage | Preis/Monat |
|----------|-----|-----|---------|-------------|
| Hetzner EX44 | 64 GB | i7-12700 | 2x 512GB SSD | 72.12€ |
| Hetzner EX47 | 64 GB | Ryzen 7 7700X | 2x 1TB NVMe | 86.41€ |
| Hetzner AX102 | 128 GB | Ryzen 9 7950X | 2x 1.92TB NVMe | 141.52€ |
| OVH | 64 GB | Xeon E-2274G | 2x 480GB SSD | 99€ |

**Empfehlung:**
- Mittel: Hetzner EX44 (72.12€/Monat)
- Groß: Hetzner EX47 (86.41€/Monat)
- Enterprise: Hetzner AX102 (141.52€/Monat)

**Vorteile:**
- Maximale Performance
- Volle Kontrolle
- Keine Virtualisierung
- Bessere Preise bei hoher Auslastung

**Nachteile:**
- Höhere monatliche Kosten
- Eigene Wartung
- Längere Setup-Zeit

---

## On-Premise vs. Cloud Vergleich

### On-Premise (Eigener Server)

**Vorteile:**
- ✅ Einmalige Investition
- ✅ Volle Datenkontrolle
- ✅ Keine laufenden Cloud-Kosten
- ✅ Maximale Performance
- ✅ Custom Hardware möglich

**Nachteile:**
- ❌ Hardware-Wartung
- ❌ Stromkosten (50-200€/Jahr)
- ❌ Kein automatisches Failover
- ❌ Eigene Backups nötig
- ❌ Hardware-Refresh alle 5-7 Jahre

**Total Cost of Ownership (5 Jahre):**
- Klein: 300€ (Hardware) + 500€ (Strom) = **800€**
- Mittel: 1000€ (Hardware) + 1500€ (Strom) = **2500€**
- Groß: 5000€ (Hardware) + 5000€ (Strom) = **10000€**

---

### Cloud (VPS/Dedicated)

**Vorteile:**
- ✅ Keine Hardware-Wartung
- ✅ Automatische Backups
- ✅ Skalierbar
- ✅ Hohe Verfügbarkeit
- ✅ Schnelles Deployment

**Nachteile:**
- ❌ Laufende Kosten
- ❌ Daten beim Anbieter
- ❌ Abhängigkeit
- ❌ Bandbreiten-Limits

**Total Cost of Ownership (5 Jahre):**
- Klein: 4.51€ × 60 = **270€** (Hetzner CX22)
- Mittel: 72.12€ × 60 = **4327€** (Hetzner EX44)
- Groß: 141.52€ × 60 = **8491€** (Hetzner AX102)

---

## Konkrete Empfehlungen

### Für Einsteiger (Bis 10 MA, 1-2 Tenants)

**Option A: Raspberry Pi 5**
```
Hardware:
- Raspberry Pi 5 (8GB RAM)
- 256GB NVMe SSD (via USB 3.0)
- Offizielles Netzteil
- Gehäuse mit Lüfter

Kosten: ~200€
Strom: ~5€/Jahr
Performance: Ausreichend für kleine Umgebungen
```

**Option B: Mini-PC**
```
Hardware:
- Intel N100 Mini-PC
- 8GB RAM
- 256GB NVMe SSD

Kosten: ~250€
Strom: ~15€/Jahr
Performance: Gut für kleine bis mittlere Umgebungen
```

---

### Für Wachsende Unternehmen (10-50 MA, 3-10 Tenants)

**Option A: Used Business PC**
```
Hardware:
- Dell OptiPlex 7090 (gebraucht)
- Intel i5-11500
- 16GB RAM
- 512GB NVMe SSD

Kosten: ~400€
Strom: ~25€/Jahr
Performance: Sehr gut
```

**Option B: VPS**
```
Anbieter: Hetzner
Modell: CX32
RAM: 8GB
CPU: 4 vCPU
Storage: 80GB SSD

Kosten: 8.91€/Monat (107€/Jahr)
Strom: Inklusive
Performance: Sehr gut
```

---

### Für Professionelle Umgebungen (50-200 MA, 10-30 Tenants)

**Option A: Dedicated Server**
```
Anbieter: Hetzner
Modell: EX44
CPU: Intel i7-12700
RAM: 64GB
Storage: 2x 512GB NVMe SSD

Kosten: 72.12€/Monat (865€/Jahr)
Strom: Inklusive
Performance: Exzellent
```

**Option B: Custom Server**
```
Hardware:
- AMD Ryzen 9 7900X
- 64GB DDR5 RAM
- 2x 1TB NVMe SSD (RAID 1)
- 650W Netzteil
- Tower Gehäuse

Kosten: ~1500€
Strom: ~80€/Jahr
Performance: Exzellent
```

---

### Für Enterprise (200+ MA, 30+ Tenants)

**Option A: High-End Dedicated**
```
Anbieter: Hetzner
Modell: AX102
CPU: AMD Ryzen 9 7950X (16 Kerne)
RAM: 128GB DDR5
Storage: 2x 1.92TB NVMe SSD

Kosten: 141.52€/Monat (1698€/Jahr)
Strom: Inklusive
Performance: Maximum
```

**Option B: Cluster**
```
Hardware:
- 2x Dell PowerEdge R750
- 2x AMD EPYC 7443 (24 Kerne)
- 2x 256GB RAM
- 2x 4TB NVMe SSD
- Load Balancer
- Backup NAS

Kosten: ~20000€ (einmalig)
Strom: ~500€/Jahr
Performance: Maximum + Redundanz
```

---

## Speicherbedarf

### Datenbank (PostgreSQL)

| Anzahl Tenants | Mitarbeiter | Datenbank-Größe |
|----------------|-------------|-----------------|
| 1-5 | 10-50 | 1-5 GB |
| 5-20 | 50-200 | 5-20 GB |
| 20-50 | 200-500 | 20-50 GB |
| 50+ | 500+ | 50-200 GB |

### Uploads (Logos, Dokumente)

| Nutzung | Speicherbedarf |
|---------|----------------|
| Keine Uploads | 0 GB |
| Nur Logos | 1-5 GB |
| Logos + Dokumente | 10-50 GB |
| Alles + Backups | 50-200 GB |

### Docker Images

```
Basis-Images:
- postgres:15-alpine        ~200 MB
- redis:7-alpine            ~30 MB
- node:20-alpine            ~180 MB
- nginx:alpine              ~40 MB

SMS Images:
- sms-backend               ~500 MB
- sms-frontend              ~300 MB

Total: ~1.25 GB
```

---

## Netzwerk-Anforderungen

### Bandbreite

| Szenario | Download | Upload |
|----------|----------|--------|
| Klein (10 MA) | 10 Mbit/s | 5 Mbit/s |
| Mittel (50 MA) | 50 Mbit/s | 25 Mbit/s |
| Groß (200 MA) | 100 Mbit/s | 50 Mbit/s |
| Enterprise (500+ MA) | 1 Gbit/s | 500 Mbit/s |

### Ports (müssen offen sein)

```
80    - HTTP (Redirect zu HTTPS)
443   - HTTPS (Web Interface)
5000  - API (Backend)
5432  - PostgreSQL (nur intern)
6379  - Redis (nur intern)
```

---

## Backup-Strategie

### On-Premise

**Tägliches Backup:**
```bash
# Datenbank
docker exec sms-postgres pg_dump -U sms_user sms_db | gzip > backup_db_$(date +%Y%m%d).sql.gz

# Uploads
tar -czf backup_uploads_$(date +%Y%m%d).tar.gz /opt/sms/uploads

# Konfiguration
tar -czf backup_config_$(date +%Y%m%d).tar.gz /opt/sms/config
```

**Storage:**
- Lokal: Externe HDD (2-4 TB)
- Remote: FTP/NAS/S3
- Rotation: 7 tägliche + 4 wöchentliche + 12 monatliche

### Cloud

**Automatische Backups:**
- Hetzner: Inklusive (7 Tage)
- DigitalOcean: Inklusive (7 Tage, 20% Aufpreis)
- AWS: EBS Snapshots (0.05$/GB/Monat)

---

## Stromverbrauch

### On-Premise

| Hardware | Verbrauch | Kosten/Jahr (0.30€/kWh) |
|----------|-----------|-------------------------|
| Raspberry Pi 5 | 5-10W | 13-26€ |
| Mini-PC | 15-30W | 39-79€ |
| Used Business PC | 50-100W | 131-263€ |
| Dedicated Server | 100-300W | 263-788€ |
| Enterprise Server | 300-800W | 788-2103€ |

### Cloud

Stromkosten sind im Preis enthalten!

---

## Fazit & Empfehlung

### Beste Option für die meisten:

**Kleine Unternehmen (bis 30 MA):**
```
Raspberry Pi 5 oder Mini-PC
Kosten: 200-300€ (einmalig)
Strom: 15-30€/Jahr
Performance: Ausreichend
```

**Mittlere Unternehmen (30-100 MA):**
```
Hetzner CX32 VPS
Kosten: 8.91€/Monat (107€/Jahr)
Strom: Inklusive
Performance: Sehr gut
```

**Große Unternehmen (100+ MA):**
```
Hetzner EX44 Dedicated
Kosten: 72.12€/Monat (865€/Jahr)
Strom: Inklusive
Performance: Exzellent
```

---

## Nächste Schritte

1. **Bedarf analysieren:** Wie viele MA, Tenants, Einsätze?
2. **Budget festlegen:** Einmalig vs. monatlich?
3. **Option wählen:** On-Premise oder Cloud?
4. **Hardware kaufen/mieten**
5. **Installation:** Siehe INSTALLATION.md
6. **Monitoring einrichten**

---

## Support

Bei Fragen zur Hardware-Auswahl:
- 📧 support@sms-platform.com
- 📚 Dokumentation: Siehe docs/ Ordner
- 💬 Community: GitHub Discussions

---

**Letzte Aktualisierung:** 2026-01-08
**Gültig für:** SMS Version 1.0+
