# 🤖 Protektor KI-System

Dieses Verzeichnis enthält das Machine Learning System für Protektor.

## Überblick

Das KI-System analysiert historische Daten und erstellt prädiktive Modelle für:

- **Mitarbeiter-Performance** - Erfolgsquoten pro Objekt
- **Objekt-Anforderungen** - Optimale Schichtgrößen, Peak-Zeiten, Schwierigkeitsgrade
- **Ausfallvorhersage** - Krankheits- und Überlastungsrisiken
- **Zeitpräferenzen** - Bevorzugte Schichtzeiten und Wochentage

## Dateien

### `mlTraining.service.ts`

Der Hauptservice für ML-Training und Vorhersagen.

**Funktionen:**

- `trainModels(tenantId)` - Trainiert alle Modelle
- `analyzeEmployeePerformance()` - Analysiert Erfolgsquoten pro Mitarbeiter-Objekt-Paar
- `learnObjectRequirements()` - Lernt objekt-spezifische Anforderungen
- `predictAbsences()` - Berechnet Ausfallwahrscheinlichkeiten
- `calculateOptimalShiftSizes()` - Ermittelt optimale Personalstärken pro Schicht
- `learnTimePreferences()` - Lernt Zeitpräferenzen der Mitarbeiter

### `trainWithDemoData.ts`

Trainingsskript für Demo-Daten.

**Ausführung:**
```bash
npm run ai:train
```

**Ausgabe:**
- Detaillierte Statistiken über Trainingsdaten
- Top-Performer Analyse
- Risiko-Mitarbeiter mit Empfehlungen
- Optimale Schichtgrößen pro Objekt
- Zeitpräferenzen der Mitarbeiter

## Verwendung

### Training starten

```bash
# Mit Demo-Daten
npm run ai:train

# In der Anwendung
const result = await mlTrainingService.trainModels(tenantId);
```

### Ergebnisse nutzen

```typescript
// Mitarbeiter-Performance
const performance = await mlTrainingService.analyzeEmployeePerformance(tenantId);
// → Erfolgsquoten, Incident-Raten, Zeitpräferenzen

// Objekt-Anforderungen
const requirements = await mlTrainingService.learnObjectRequirements(tenantId);
// → Optimales Personal, Peak-Zeiten, Schwierigkeitsgrad

// Ausfallvorhersage
const predictions = await mlTrainingService.predictAbsences(tenantId);
// → Risikoscore, Risikofaktoren, Empfehlungen

// Schichtgrößen
const sizes = await mlTrainingService.calculateOptimalShiftSizes(tenantId);
// → Optimale Personalstärke pro Tageszeit

// Zeitpräferenzen
const prefs = await mlTrainingService.learnTimePreferences(tenantId);
// → Bevorzugte Tage, Zeiten, Schichtlängen
```

## Algorithmen

### Mitarbeiter-Performance

- **Success Rate** = Genehmigte Schichten / Gesamtschichten
- **Incident Rate** = Vorfälle / 100 Schichten
- **Zeitpräferenzen** = Verteilung über Morgen/Mittag/Abend/Nacht

### Ausfallvorhersage

Risikofaktoren (gewichtet):
- Häufige Krankheitstage (+30 Punkte)
- Überstunden >10h/Schicht (+20 Punkte)
- Keine Urlaubstage (+10 Punkte)
- Viele Nachtschichten (+15 Punkte)
- Häufige Wochenendarbeit (+10 Punkte)

→ **Wahrscheinlichkeit** = min(100, Risikoscore) / 100

### Objekt-Anforderungen

- **Durchschnittliches Personal** = Mittelwert aus historischen Schichtberichten
- **Peak-Zeiten** = Häufigste Schichtstartzeiten
- **Incident Rate** = Vorfälle pro 100 Schichten
- **Schwierigkeit** = Komplexität aus Incidents, Nachtschichten, Objekttyp

### Optimale Schichtgrößen

Gruppierung nach Tageszeit:
- Morgen (06-12): Ø Personal
- Nachmittag (12-18): Ø Personal
- Abend (18-22): Ø Personal
- Nacht (22-06): Ø Personal

### Zeitpräferenzen

- **Bevorzugte Tage** = Top 5 Wochentage nach Häufigkeit
- **Bevorzugte Zeit** = Häufigste Schichtstartzeit
- **Schichtlänge** = Durchschnittliche Schichtdauer

## Integration mit AutoPlanner

Die KI-Ergebnisse können den AutoPlanner verbessern:

```typescript
// Statt statischer Werte:
const requiredCount = object.defaultPersonnel;

// Nutze KI-Vorhersage:
const requirements = await mlTrainingService.learnObjectRequirements(tenantId);
const optimalSize = requirements.find(r => r.objectId === object.id);
const requiredCount = optimalSize?.avgPersonnelNeeded || object.defaultPersonnel;

// Nutze Mitarbeiter-Performance:
const performance = await mlTrainingService.analyzeEmployeePerformance(tenantId);
const empPerf = performance.find(p => p.employeeId === emp.id && p.objectId === object.id);
const bonusScore = empPerf ? empPerf.successRate * 20 : 0;
candidate.score += bonusScore;

// Nutze Ausfallvorhersage:
const predictions = await mlTrainingService.predictAbsences(tenantId);
const risk = predictions.find(p => p.employeeId === emp.id);
if (risk?.absenceProbability > 0.5) {
  candidate.warnings.push('Hohes Ausfallrisiko');
  candidate.score -= 10;
}

// Nutze Zeitpräferenzen:
const prefs = await mlTrainingService.learnTimePreferences(tenantId);
const pref = prefs.find(p => p.employeeId === emp.id);
if (pref?.preferredDays.includes(dayOfWeek)) {
  candidate.score += 5;
}
```

## Trainingsdaten-Mindestanforderungen

Für aussagekräftige Ergebnisse:

- **Mitarbeiter-Performance**: Mindestens 10 Schichten pro Mitarbeiter
- **Objekt-Anforderungen**: Mindestens 20 Schichtberichte pro Objekt
- **Ausfallvorhersage**: Mindestens 30 Zeiteinträge pro Mitarbeiter
- **Optimale Schichtgrößen**: Mindestens 5 Schichtberichte pro Objekt
- **Zeitpräferenzen**: Mindestens 15 Schichten pro Mitarbeiter

## Konfidenz-Level

- **High** ≥ 30 Datenpunkte
- **Medium** ≥ 15 Datenpunkte
- **Low** < 15 Datenpunkte

## Zukunft

Geplante Erweiterungen:

- [ ] TensorFlow.js Integration für neuronale Netze
- [ ] Clustering für Mitarbeiter-Gruppen
- [ ] Zeitreihen-Analyse für Saisonmuster
- [ ] Anomalie-Erkennung für unübliche Muster
- [ ] Automatisches Retrainings bei neuen Daten

## Dokumentation

Siehe auch:
- [AutoPlanner](../services/autoPlanner.service.ts)
- [Demo-Daten](../../prisma/seed-demo-data-extended.ts)
- [Support-System](../services/support.service.ts)
