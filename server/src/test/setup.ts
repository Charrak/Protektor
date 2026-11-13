const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL ist erforderlich. Tests dürfen nicht die Anwendungs-DATABASE_URL verwenden.',
  );
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integrationstests dürfen nur mit NODE_ENV=test ausgeführt werden.');
}

let databaseName: string;
try {
  const parsed = new URL(testDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Unsupported database protocol');
  }
  databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
} catch {
  throw new Error('TEST_DATABASE_URL ist keine gültige PostgreSQL-URL.');
}

if (!/(^|[_-])test$/i.test(databaseName)) {
  throw new Error(
    `Tests verweigert: Datenbankname "${databaseName}" endet nicht auf "_test" oder "-test".`,
  );
}

// Prisma clients are constructed by imported test modules; override before
// those modules load so they can never inherit the application's DB URL.
process.env.DATABASE_URL = testDatabaseUrl;
