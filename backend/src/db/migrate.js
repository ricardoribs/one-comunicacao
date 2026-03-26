const fs = require('fs');
const path = require('path');
const { runner } = require('node-pg-migrate');
const env = require('../config/env');

function buildMigrationDatabaseConfig() {
  if (env.databaseHost && env.databaseUser && env.databaseName) {
    const config = {
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      user: env.databaseUser,
      password: env.databasePassword,
    };

    if (env.databaseSslCaFile) {
      if (!fs.existsSync(env.databaseSslCaFile)) {
        throw new Error(`DATABASE_SSL_CA_FILE nao encontrado para migrations: ${env.databaseSslCaFile}`);
      }

      config.ssl = {
        ca: fs.readFileSync(env.databaseSslCaFile, 'utf8'),
        rejectUnauthorized: true,
      };
    }

    return config;
  }

  return env.databaseUrl;
}

async function main() {
  const direction = process.argv[2] || 'up';
  const count = process.argv[3] ? Number(process.argv[3]) : undefined;

  if (!['up', 'down'].includes(direction)) {
    throw new Error("Direcao de migration invalida. Use 'up' ou 'down'.");
  }

  await runner({
    databaseUrl: buildMigrationDatabaseConfig(),
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
