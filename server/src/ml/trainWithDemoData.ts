/**
 * KI Training Script für Protektor
 * 
 * Trainiert die ML-Modelle mit den aktuellen Demo-Daten
 * 
 * Ausführung: npx tsx src/ml/trainWithDemoData.ts
 */

import { prisma } from '../config/database';
import { mlTrainingService } from './mlTraining.service';

async function main() {
  console.log('═'.repeat(70));
  console.log('🤖 KI TRAINING MIT DEMO-DATEN');
  console.log('═'.repeat(70));
  console.log();

  // Tenant finden
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: 'DEMO-001' } });
  if (!tenant) {
    console.error('❌ Demo Tenant nicht gefunden! Bitte zuerst seed-demo-data.ts ausführen.');
    process.exit(1);
  }
  console.log(`✅ Tenant gefunden: ${tenant.companyName} (${tenant.tenantId})\n`);

  // Statistiken anzeigen
  const stats = await getStats(tenant.id);
  console.log('📊 Verfügbare Trainingsdaten:');
  console.log(`   👥 Mitarbeiter: ${stats.employees}`);
  console.log(`   🏢 Kunden: ${stats.customers}`);
  console.log(`   🏗️ Objekte: ${stats.objects}`);
  console.log(`   📅 Einsätze: ${stats.deployments}`);
  console.log(`   📋 Schichtberichte: ${stats.shiftReports}`);
  console.log(`   ⏰ Zeiterfassung: ${stats.timeRecords}`);
  console.log(`   💰 Rechnungen: ${stats.invoices}`);
  console.log(`   🎫 Support-Tickets: ${stats.supportTickets}`);
  console.log(`   🔔 Benachrichtigungen: ${stats.notifications}`);
  console.log();

  // Training starten
  console.log('🚀 Starte Training...\n');
  const result = await mlTrainingService.trainModels(tenant.id);

  console.log();
  console.log('═'.repeat(70));
  console.log('🎉 TRAINING ERFOLGREICH ABGESCHLOSSEN');
  console.log('═'.repeat(70));
  console.log();
  console.log('📈 Training-Ergebnisse:');
  console.log(`   🧑‍💼 Mitarbeiter-Performance: ${result.employeePerformance} Einträge`);
  console.log(`   🎯 Objekt-Anforderungen: ${result.objectRequirements} Objekte`);
  console.log(`   ⚠️  Ausfallvorhersagen: ${result.absencePredictions} Mitarbeiter`);
  console.log(`   👥 Optimale Schichtgrößen: ${result.optimalShiftSizes} Objekte`);
  console.log(`   ⏰ Zeitpräferenzen: ${result.timePreferences} Mitarbeiter`);
  console.log(`   ⏱️  Dauer: ${result.duration}s`);
  console.log();

  // Detaillierte Analyse anzeigen
  await showDetailedAnalysis(tenant.id);

  console.log('═'.repeat(70));
  console.log('✅ KI ist jetzt bereit für optimierte Dienstplanung!');
  console.log('═'.repeat(70));
}

async function getStats(tenantId: string) {
  const [employees, customers, objects, deployments, shiftReports, timeRecords, invoices, supportTickets, notifications] = await Promise.all([
    prisma.employee.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.sMSObject.count({ where: { tenantId } }),
    prisma.deployment.count({ where: { tenantId } }),
    prisma.shiftReport.count({ where: { tenantId } }),
    prisma.timeRecord.count({ where: { tenantId } }),
    prisma.customerInvoice.count({ where: { tenantId } }),
    prisma.supportTicket.count({ where: { tenantId } }),
    prisma.notification.count(),
  ]);

  return { employees, customers, objects, deployments, shiftReports, timeRecords, invoices, supportTickets, notifications };
}

async function showDetailedAnalysis(tenantId: string) {
  console.log('🔍 DETAILLIERTE ANALYSE:');
  console.log();

  // 1. Mitarbeiter-Performance
  console.log('📊 MITARBEITER-PERFORMANCE:');
  const employeePerformance = await mlTrainingService.analyzeEmployeePerformance(tenantId);
  
  if (employeePerformance.length > 0) {
    const topPerformers = employeePerformance
      .filter(p => p.successRate > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    for (const perf of topPerformers) {
      const emp = await prisma.employee.findUnique({ where: { id: perf.employeeId } });
      const obj = await prisma.sMSObject.findUnique({ where: { id: perf.objectId } });
      if (emp && obj) {
        console.log(`   ✅ ${emp.firstName} ${emp.lastName} @ ${obj.name}`);
        console.log(`      Erfolgsquote: ${(perf.successRate * 100).toFixed(0)}% (${perf.completedShifts}/${perf.totalShifts} Schichten)`);
        console.log(`      Vorfälle: ${perf.incidents}`);
      }
    }
  } else {
    console.log('   ℹ️  Noch keine historischen Daten verfügbar');
  }
  console.log();

  // 2. Objekt-Anforderungen
  console.log('🎯 OBJEKT-ANFORDERUNGEN:');
  const objectRequirements = await mlTrainingService.learnObjectRequirements(tenantId);
  
  for (const req of objectRequirements) {
    const obj = await prisma.sMSObject.findUnique({ where: { id: req.objectId } });
    if (obj) {
      console.log(`   🏗️  ${obj.name}`);
      console.log(`      Ø Personal: ${req.avgPersonnelNeeded} Personen`);
      console.log(`      Peak-Zeit: ${req.peakHours.start}:00 - ${req.peakHours.end}:00`);
      console.log(`      Schwierigkeit: ${'⭐'.repeat(req.difficultyScore)} (${req.difficultyScore}/10)`);
      console.log(`      Incident-Rate: ${req.incidentRate}%`);
    }
  }
  console.log();

  // 3. Ausfallvorhersage
  console.log('⚠️  AUSFALLVORHERSAGE (Risiko-Mitarbeiter):');
  const absencePredictions = await mlTrainingService.predictAbsences(tenantId);
  
  const highRisk = absencePredictions
    .filter(p => p.absenceProbability >= 0.3)
    .sort((a, b) => b.absenceProbability - a.absenceProbability)
    .slice(0, 5);

  if (highRisk.length > 0) {
    for (const pred of highRisk) {
      const emp = await prisma.employee.findUnique({ where: { id: pred.employeeId } });
      if (emp) {
        console.log(`   ⚠️  ${emp.firstName} ${emp.lastName}`);
        console.log(`      Risiko: ${(pred.absenceProbability * 100).toFixed(0)}%`);
        console.log(`      Faktoren: ${pred.riskFactors.join(', ')}`);
        console.log(`      Empfehlung: ${pred.recommendedActions.join(', ')}`);
      }
    }
  } else {
    console.log('   ✅ Alle Mitarbeiter haben niedriges Risiko');
  }
  console.log();

  // 4. Optimale Schichtgrößen
  console.log('👥 OPTIMALE SCHICHTGRÖßEN:');
  const shiftSizes = await mlTrainingService.calculateOptimalShiftSizes(tenantId);
  
  if (shiftSizes.length > 0) {
    for (const size of shiftSizes) {
      const obj = await prisma.sMSObject.findUnique({ where: { id: size.objectId } });
      if (obj) {
        console.log(`   🏗️  ${obj.name}`);
        console.log(`      Frühschicht: ${size.optimalSizes.morning} Personen`);
        console.log(`      Spätschicht: ${size.optimalSizes.afternoon} Personen`);
        console.log(`      Abendschicht: ${size.optimalSizes.evening} Personen`);
        console.log(`      Nachtschicht: ${size.optimalSizes.night} Personen`);
        console.log(`      Konfidenz: ${size.confidence} (${size.dataPoints} Datenpunkte)`);
      }
    }
  } else {
    console.log('   ℹ️  Noch nicht genug Daten für Schichtgrößen-Analyse');
  }
  console.log();

  // 5. Zeitpräferenzen
  console.log('⏰ ZEITPREFERENZEN DER MITARBEITER:');
  const timePrefs = await mlTrainingService.learnTimePreferences(tenantId);
  
  if (timePrefs.length > 0) {
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    for (const pref of timePrefs.slice(0, 5)) {
      const emp = await prisma.employee.findUnique({ where: { id: pref.employeeId } });
      if (emp) {
        const days = pref.preferredDays.map(d => dayNames[d]).join(', ');
        console.log(`   🧑‍💼 ${emp.firstName} ${emp.lastName}`);
        console.log(`      Bevorzugte Tage: ${days}`);
        console.log(`      Bevorzugte Zeit: ${pref.preferredHour}:00`);
        console.log(`      Ø Schichtlänge: ${pref.preferredShiftLength}h`);
        console.log(`      Konfidenz: ${pref.confidence} (${pref.totalShifts} Schichten)`);
      }
    }
  } else {
    console.log('   ℹ️  Noch nicht genug Daten für Zeitpräferenz-Analyse');
  }
  console.log();
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
