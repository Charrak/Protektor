import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎁 Erstelle Customer Portal Add-on...\n');

  const customerPortalAddon = await prisma.addon.upsert({
    where: { slug: 'customer-portal' },
    update: {
      name: 'Kundenportal',
      description: 'Professionelles Kundenportal mit Rechnungsübersicht, Leistungsnachweisen und Objektberichten. Ihre Kunden können jederzeit ihre Daten einsehen und Dokumente herunterladen.',
      category: 'communication',
      monthlyPrice: 49.00,
      yearlyPrice: 470.40, // 20% Rabatt bei jährlicher Zahlung
      setupFee: 99.00,
      featureKey: 'customer_portal',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      name: 'Kundenportal',
      slug: 'customer-portal',
      description: 'Professionelles Kundenportal mit Rechnungsübersicht, Leistungsnachweisen und Objektberichten. Ihre Kunden können jederzeit ihre Daten einsehen und Dokumente herunterladen.',
      category: 'communication',
      monthlyPrice: 49.00,
      yearlyPrice: 470.40,
      setupFee: 99.00,
      featureKey: 'customer_portal',
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('✅ Customer Portal Add-on erstellt:');
  console.log(`   ID: ${customerPortalAddon.id}`);
  console.log(`   Name: ${customerPortalAddon.name}`);
  console.log(`   Monatlicher Preis: ${customerPortalAddon.monthlyPrice}€`);
  console.log(`   Jährlicher Preis: ${customerPortalAddon.yearlyPrice}€ (20% Rabatt)`);
  console.log(`   Einrichtungsgebühr: ${customerPortalAddon.setupFee}€`);
  console.log(`   Feature-Key: ${customerPortalAddon.featureKey}`);
  console.log(`   Kategorie: ${customerPortalAddon.category}`);

  console.log('\n📋 Funktionen des Kundenportals:');
  console.log('   ✅ Rechnungsübersicht und Download');
  console.log('   ✅ Leistungsnachweise einsehen');
  console.log('   ✅ Objektberichte und Schichtberichte');
  console.log('   ✅ Dokumente herunterladen');
  console.log('   ✅ Eigene Kontaktdaten verwalten');
  console.log('   ✅ Rollen und Berechtigungen');
  console.log('   ✅ DSGVO-konforme Zugriffsprotokolle');

  console.log('\n🎯 Zielgruppe:');
  console.log('   • Sicherheitsfirmen mit regelmäßiger Kundenkommunikation');
  console.log('   • Unternehmen die Transparenz und Professionalität bieten möchten');
  console.log('   • Kunden die selbstständig Informationen abrufen wollen');

  console.log('\n💰 Preisgestaltung:');
  console.log('   • Monatlich: 49,00€ / Monat');
  console.log('   • Jährlich: 470,40€ / Jahr (entspricht 39,20€ / Monat)');
  console.log('   • Einmalige Einrichtungsgebühr: 99,00€');
  console.log('   • ROI: Reduziert Support-Aufwand um ~30%');

  console.log('\n✨ Add-on erfolgreich erstellt!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Erstellen des Add-ons:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
