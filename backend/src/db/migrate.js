const path = require('path');
const { runner } = require('node-pg-migrate');
const env = require('../config/env');

async function main() {
  const direction = process.argv[2] || 'up';
  const count = process.argv[3] ? Number(process.argv[3]) : undefined;

  if (!['up', 'down'].includes(direction)) {
    throw new Error("Direcao de migration invalida. Use 'up' ou 'down'.");
  }

  await runner({
    databaseUrl: env.databaseUrl,
    dir: path.join(__dirname, 'pgmigrations'),
    direction,
    count,
    migrationsTable: 'app_schema_migrations',
    log: direction === 'down' ? console.warn : console.log,
    noLock: false,
    createSchema: false,
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
