# 📁 ML-Trainingsdaten

Dieses Verzeichnis enthält die Ergebnisse des KI-Trainings für Protektor.

## 📄 Dateien

### `TRAINING-BERICHT.md`
Detaillierter Bericht des letzten Trainings mit:
- Top Performer Analyse
- Objekt-Anforderungen
- Optimale Schichtgrößen
- Mitarbeiter-Empfehlungen
- Nächste Schritte

### `summary.json`
Maschinenlesbare Zusammenfassung der wichtigsten Ergebnisse:
- Top Performer
- Risikoreiche Objekte
- Optimale Zuweisungen
- Schichtgrößen-Empfehlungen
- Ausfallrisiken

### `training-results-YYYYMMDD-HHMMSS.json`
Vollständige Rohdaten des Trainings mit allen Modellen:
- Employee Performance (24 Einträge)
- Object Requirements (5 Objekte)
- Absence Predictions (5 Mitarbeiter)
- Optimal Shift Sizes (5 Objekte)
- Time Preferences (5 Mitarbeiter)

## 🔄 Training durchführen

### Offline-Training (Sandbox)
```bash
cd server
npm run ai:train
```

Das Training:
1. Generiert Mock-Daten basierend auf den Demo-Daten
2. Trainiert alle ML-Modelle
3. Speichert Ergebnisse in diesem Verzeichnis
4. Erstellt einen detaillierten Bericht

### Ergebnis-Dateien

Nach dem Training werden folgende Dateien erstellt:
- `training-results-YYYYMMDD-HHMMSS.json` - Vollständige Rohdaten
- `summary.json` - Zusammenfassung (wird überschrieben)
- `TRAINING-BERICHT.md` - Detaillierter Bericht (wird überschrieben)

## 📊 Ergebnisse nutzen

### In der Anwendung

```typescript
// Ergebnisse laden
import summary from './ml-data/summary.json';

// Top Performer für Objekt finden
const topPerformers = summary.topPerformers.filter(
  p => p.object === 'Messehalle Berlin'
);

// Optimale Schichtgröße ermitteln
const shiftSize = summary.shiftSizeRecommendations['Kulturzentrum Berlin'];

// Risikoreiche Objekte identifizieren
const riskyObjects = summary.riskyObjects;
```

### Für manuelle Planung

1. **Top Performer bevorzugen:**
   - Peter Wagner → Messehalle Berlin
   - Lisa Fischer → TechPark - Gebäude B

2. **Risikoreiche Objekte:**
   - Kulturzentrum Berlin (30% Incident-Rate)
   - TechPark - Gebäude A (28.6% Incident-Rate)
   - → Nur erfahrene Mitarbeiter einsetzen

3. **Vermeidbare Zuweisungen:**
   - Max Mustermann → TechPark - Gebäude B (nur 25% Erfolgsquote)

## 📈 Training verbessern

Für genauere Vorhersagen:
1. Mehr historische Daten sammeln (mindestens 20 Datenpunkte pro Objekt)
2. Schichtberichte konsistent erfassen
3. Incidents systematisch dokumentieren
4. Alle 3 Monate Retraining durchführen

## 🔗 Verwandte Dateien

- Trainingsskript: `src/ml/trainOffline.ts`
- ML Service: `src/ml/mlTraining.service.ts`
- Demo-Daten: `prisma/seed-demo-data-extended.ts`
- Dokumentation: `src/ml/README.md`

---

*Letztes Training: 2026-11-10 11:01:21 UTC*
