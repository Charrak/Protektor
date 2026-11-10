/**
 * Offline ML Training für die Sandbox
 * 
 * Simuliert das Training mit Mock-Daten basierend auf den Demo-Daten
 * ohne Datenbankverbindung
 */

import fs from 'fs';
import path from 'path';

// Demo-Daten (basierend auf seed-demo-data-extended.ts)
const DEMO_DATA = {
  employees: [
    { id: 'emp-001', firstName: 'Max', lastName: 'Mustermann', personnelNumber: 'MA-001' },
    { id: 'emp-002', firstName: 'Anna', lastName: 'Schmidt', personnelNumber: 'MA-002' },
    { id: 'emp-003', firstName: 'Tom', lastName: 'Weber', personnelNumber: 'MA-003' },
    { id: 'emp-004', firstName: 'Lisa', lastName: 'Fischer', personnelNumber: 'MA-004' },
    { id: 'emp-005', firstName: 'Peter', lastName: 'Wagner', personnelNumber: 'MA-005' },
  ],
  objects: [
    { id: 'obj-001', name: 'Müller GmbH - Hauptgebäude', customerId: 'cust-001' },
    { id: 'obj-002', name: 'Kulturzentrum Berlin', customerId: 'cust-002' },
    { id: 'obj-003', name: 'TechPark - Gebäude A', customerId: 'cust-003' },
    { id: 'obj-004', name: 'TechPark - Gebäude B', customerId: 'cust-003' },
    { id: 'obj-005', name: 'Messehalle Berlin', customerId: 'cust-004' },
  ],
  customers: [
    { id: 'cust-001', companyName: 'Müller GmbH' },
    { id: 'cust-002', companyName: 'Stadt Berlin - Kulturamt' },
    { id: 'cust-003', companyName: 'TechPark Berlin' },
    { id: 'cust-004', companyName: 'Event Company Berlin' },
  ],
};

// Simulierte historische Daten
function generateMockHistoricalData() {
  const deployments = [];
  const shiftReports = [];
  const timeRecords = [];

  // Generiere 50 zufällige Einsätze
  for (let i = 0; i < 50; i++) {
    const emp = DEMO_DATA.employees[Math.floor(Math.random() * DEMO_DATA.employees.length)];
    const obj = DEMO_DATA.objects[Math.floor(Math.random() * DEMO_DATA.objects.length)];
    const date = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Letzte 90 Tage
    const hour = Math.floor(Math.random() * 24);

    deployments.push({
      employeeId: emp.id,
      objectId: obj.id,
      date,
      startTime: hour,
      status: Math.random() > 0.1 ? 'completed' : 'cancelled',
    });

    // Schichtbericht für die meisten Einsätze
    if (Math.random() > 0.2) {
      shiftReports.push({
        employeeId: emp.id,
        objectId: obj.id,
        reportDate: date,
        shiftStart: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour),
        personnelCount: Math.floor(Math.random() * 3) + 1,
        incidents: Math.random() > 0.8 ? [{ time: '14:00', type: 'minor', description: 'Kleiner Vorfall' }] : [],
        status: Math.random() > 0.1 ? 'approved' : 'submitted',
      });
    }

    // Zeiterfassung
    timeRecords.push({
      employeeId: emp.id,
      date,
      clockIn: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour),
      clockOut: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 8),
      totalHours: 8,
    });
  }

  return { deployments, shiftReports, timeRecords };
}

// Training-Funktionen
function analyzeEmployeePerformance(deployments: any[], shiftReports: any[]) {
  const performanceMap = new Map<string, any>();

  for (const deployment of deployments) {
    const key = `${deployment.employeeId}-${deployment.objectId}`;

    if (!performanceMap.has(key)) {
      performanceMap.set(key, {
        employeeId: deployment.employeeId,
        objectId: deployment.objectId,
        totalShifts: 0,
        completedShifts: 0,
        incidents: 0,
        successRate: 0,
      });
    }

    const perf = performanceMap.get(key)!;
    perf.totalShifts++;

    const report = shiftReports.find(r =>
      r.employeeId === deployment.employeeId &&
      r.objectId === deployment.objectId &&
      r.reportDate.toDateString() === deployment.date.toDateString()
    );

    if (report && report.status === 'approved') {
      perf.completedShifts++;
    }

    if (report?.incidents?.length > 0) {
      perf.incidents += report.incidents.length;
    }
  }

  const results = [];
  for (const perf of performanceMap.values()) {
    perf.successRate = perf.totalShifts > 0 ? perf.completedShifts / perf.totalShifts : 0;
    results.push(perf);
  }

  return results;
}

function learnObjectRequirements(objects: any[], shiftReports: any[]) {
  return objects.map(obj => {
    const reports = shiftReports.filter(r => r.objectId === obj.id);

    if (reports.length === 0) {
      return {
        objectId: obj.id,
        avgPersonnelNeeded: 2,
        peakHours: { start: 8, end: 16 },
        incidentRate: 0,
        difficultyScore: 3,
      };
    }

    const avgPersonnel = reports.reduce((sum, r) => sum + r.personnelCount, 0) / reports.length;
    const incidents = reports.reduce((sum, r) => sum + (r.incidents?.length || 0), 0);
    const incidentRate = (incidents / reports.length) * 100;

    return {
      objectId: obj.id,
      avgPersonnelNeeded: Math.round(avgPersonnel * 10) / 10,
      peakHours: { start: 8, end: 16 },
      incidentRate: Math.round(incidentRate * 10) / 10,
      difficultyScore: Math.min(10, Math.max(1, Math.round(incidentRate / 10) + 2)),
    };
  });
}

function predictAbsences(employees: any[], timeRecords: any[]) {
  return employees.map(emp => {
    const records = timeRecords.filter(r => r.employeeId === emp.id);
    const recentRecords = records.slice(-30);
    const avgHours = recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0) / recentRecords.length
      : 8;

    let riskScore = 0;
    const riskFactors: string[] = [];

    if (avgHours > 10) {
      riskFactors.push('Hohe durchschnittliche Arbeitszeit (>10h/Schicht)');
      riskScore += 20;
    }

    if (records.length > 40) {
      riskFactors.push('Viele Einsätze in den letzten 90 Tagen');
      riskScore += 15;
    }

    return {
      employeeId: emp.id,
      absenceProbability: Math.min(100, riskScore) / 100,
      riskFactors,
      recommendedActions: riskFactors.length > 0 ? ['Schichtplanung überprüfen'] : ['Keine Maßnahmen erforderlich'],
    };
  });
}

function calculateOptimalShiftSizes(objects: any[], shiftReports: any[]) {
  return objects.map(obj => {
    const reports = shiftReports.filter(r => r.objectId === obj.id);

    if (reports.length === 0) {
      return {
        objectId: obj.id,
        optimalSizes: { morning: 2, afternoon: 2, evening: 1, night: 1 },
        dataPoints: 0,
        confidence: 'low',
      };
    }

    const morning = reports.filter(r => r.shiftStart.getHours() >= 6 && r.shiftStart.getHours() < 12);
    const afternoon = reports.filter(r => r.shiftStart.getHours() >= 12 && r.shiftStart.getHours() < 18);
    const evening = reports.filter(r => r.shiftStart.getHours() >= 18 && r.shiftStart.getHours() < 22);
    const night = reports.filter(r => r.shiftStart.getHours() >= 22 || r.shiftStart.getHours() < 6);

    const avg = (arr: any[]) => arr.length > 0 ? arr.reduce((sum, r) => sum + r.personnelCount, 0) / arr.length : 1;

    return {
      objectId: obj.id,
      optimalSizes: {
        morning: Math.round(avg(morning) * 10) / 10,
        afternoon: Math.round(avg(afternoon) * 10) / 10,
        evening: Math.round(avg(evening) * 10) / 10,
        night: Math.round(avg(night) * 10) / 10,
      },
      dataPoints: reports.length,
      confidence: reports.length >= 20 ? 'high' : reports.length >= 10 ? 'medium' : 'low',
    };
  });
}

function learnTimePreferences(employees: any[], deployments: any[]) {
  return employees.map(emp => {
    const deps = deployments.filter(d => d.employeeId === emp.id);

    if (deps.length < 5) {
      return {
        employeeId: emp.id,
        preferredDays: [1, 2, 3, 4, 5],
        preferredHour: 8,
        preferredShiftLength: 8,
        totalShifts: deps.length,
        confidence: 'low',
      };
    }

    const hourCounts = new Map<number, number>();
    for (const dep of deps) {
      hourCounts.set(dep.startTime, (hourCounts.get(dep.startTime) || 0) + 1);
    }

    const sortedHours = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1]);
    const preferredHour = sortedHours[0]?.[0] || 8;

    return {
      employeeId: emp.id,
      preferredDays: [1, 2, 3, 4, 5], // Mo-Fr
      preferredHour,
      preferredShiftLength: 8,
      totalShifts: deps.length,
      confidence: deps.length >= 30 ? 'high' : deps.length >= 15 ? 'medium' : 'low',
    };
  });
}

// Haupt-Training
async function main() {
  console.log('═'.repeat(70));
  console.log('🤖 OFFLINE KI TRAINING (Sandbox)');
  console.log('═'.repeat(70));
  console.log();

  console.log('📊 Generiere Mock-Daten basierend auf Demo-Daten...\n');

  const { deployments, shiftReports, timeRecords } = generateMockHistoricalData();

  console.log(`✅ Generierte Daten:`);
  console.log(`   📅 Einsätze: ${deployments.length}`);
  console.log(`   📋 Schichtberichte: ${shiftReports.length}`);
  console.log(`   ⏰ Zeiterfassung: ${timeRecords.length}`);
  console.log();

  console.log('🚀 Starte Training...\n');
  const startTime = Date.now();

  // Training ausführen
  const employeePerformance = analyzeEmployeePerformance(deployments, shiftReports);
  const objectRequirements = learnObjectRequirements(DEMO_DATA.objects, shiftReports);
  const absencePredictions = predictAbsences(DEMO_DATA.employees, timeRecords);
  const optimalShiftSizes = calculateOptimalShiftSizes(DEMO_DATA.objects, shiftReports);
  const timePreferences = learnTimePreferences(DEMO_DATA.employees, deployments);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('🎉 Training abgeschlossen!\n');

  // Ergebnisse zusammenstellen
  const results = {
    trainedAt: new Date().toISOString(),
    duration: `${duration}s`,
    dataPoints: {
      deployments: deployments.length,
      shiftReports: shiftReports.length,
      timeRecords: timeRecords.length,
    },
    models: {
      employeePerformance: {
        count: employeePerformance.length,
        data: employeePerformance,
      },
      objectRequirements: {
        count: objectRequirements.length,
        data: objectRequirements,
      },
      absencePredictions: {
        count: absencePredictions.length,
        data: absencePredictions,
      },
      optimalShiftSizes: {
        count: optimalShiftSizes.length,
        data: optimalShiftSizes,
      },
      timePreferences: {
        count: timePreferences.length,
        data: timePreferences,
      },
    },
  };

  // Ergebnisse speichern
  const outputPath = path.join(__dirname, '../../ml-training-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('═'.repeat(70));
  console.log('📈 TRAINING-ERGEBNISSE');
  console.log('═'.repeat(70));
  console.log();

  // Top Performer
  console.log('🏆 TOP PERFORMER (nach Erfolgsquote):');
  const topPerformers = employeePerformance
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  for (const perf of topPerformers) {
    const emp = DEMO_DATA.employees.find(e => e.id === perf.employeeId);
    const obj = DEMO_DATA.objects.find(o => o.id === perf.objectId);
    if (emp && obj) {
      console.log(`   ✅ ${emp.firstName} ${emp.lastName} @ ${obj.name}`);
      console.log(`      Erfolgsquote: ${(perf.successRate * 100).toFixed(0)}% (${perf.completedShifts}/${perf.totalShifts})`);
      console.log(`      Vorfälle: ${perf.incidents}`);
    }
  }
  console.log();

  // Objekt-Anforderungen
  console.log('🎯 OBJEKT-ANFORDERUNGEN:');
  for (const req of objectRequirements) {
    const obj = DEMO_DATA.objects.find(o => o.id === req.objectId);
    if (obj) {
      console.log(`   🏗️  ${obj.name}`);
      console.log(`      Ø Personal: ${req.avgPersonnelNeeded} Personen`);
      console.log(`      Peak-Zeit: ${req.peakHours.start}:00 - ${req.peakHours.end}:00`);
      console.log(`      Schwierigkeit: ${'⭐'.repeat(req.difficultyScore)} (${req.difficultyScore}/10)`);
      console.log(`      Incident-Rate: ${req.incidentRate}%`);
    }
  }
  console.log();

  // Ausfallvorhersage
  console.log('⚠️  AUSFALLVORHERSAGE:');
  const highRisk = absencePredictions.filter(p => p.absenceProbability >= 0.2);
  if (highRisk.length > 0) {
    for (const pred of highRisk) {
      const emp = DEMO_DATA.employees.find(e => e.id === pred.employeeId);
      if (emp) {
        console.log(`   ⚠️  ${emp.firstName} ${emp.lastName}`);
        console.log(`      Risiko: ${(pred.absenceProbability * 100).toFixed(0)}%`);
        if (pred.riskFactors.length > 0) {
          console.log(`      Faktoren: ${pred.riskFactors.join(', ')}`);
        }
      }
    }
  } else {
    console.log('   ✅ Alle Mitarbeiter haben niedriges Risiko');
  }
  console.log();

  // Optimale Schichtgrößen
  console.log('👥 OPTIMALE SCHICHTGRÖßEN:');
  for (const size of optimalShiftSizes) {
    const obj = DEMO_DATA.objects.find(o => o.id === size.objectId);
    if (obj) {
      console.log(`   🏗️  ${obj.name}`);
      console.log(`      Frühschicht: ${size.optimalSizes.morning} Personen`);
      console.log(`      Spätschicht: ${size.optimalSizes.afternoon} Personen`);
      console.log(`      Abendschicht: ${size.optimalSizes.evening} Personen`);
      console.log(`      Nachtschicht: ${size.optimalSizes.night} Personen`);
      console.log(`      Konfidenz: ${size.confidence} (${size.dataPoints} Datenpunkte)`);
    }
  }
  console.log();

  console.log('═'.repeat(70));
  console.log('💾 Ergebnisse gespeichert in: ml-training-results.json');
  console.log('═'.repeat(70));
}

main().catch(console.error);
