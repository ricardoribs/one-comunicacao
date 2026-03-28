const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
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

function buildPgClientConfig(databaseConfig) {
  if (typeof databaseConfig === 'string') {
    return {
      connectionString: databaseConfig,
    };
  }

  return {
    ...databaseConfig,
  };
}

async function reconcileLegacyMigrationNames(databaseConfig) {
  const client = new Client(buildPgClientConfig(databaseConfig));

  await client.connect();

  try {
    const tableCheck = await client.query("SELECT to_regclass('public.app_schema_migrations') AS table_name");
    if (!tableCheck.rows[0]?.table_name) {
      return;
    }

    const { rows } = await client.query(
      `
        SELECT name
          FROM app_schema_migrations
         WHERE name = ANY($1::text[])
      `,
      [['010_user_daily_checklists', '011_user_daily_checklists']]
    );

    const names = new Set(rows.map((row) => row.name));
    if (!names.has('010_user_daily_checklists') || names.has('011_user_daily_checklists')) {
      return;
    }

    await client.query(
      `
        UPDATE app_schema_migrations
           SET name = $1
         WHERE name = $2
      `,
      ['011_user_daily_checklists', '010_user_daily_checklists']
    );

    console.log('Compatibilidade aplicada: 010_user_daily_checklists renomeada para 011_user_daily_checklists.');
  } finally {
    await client.end();
  }
}

async function main() {
  const direction = process.argv[2] || 'up';
  const count = process.argv[3] ? Number(process.argv[3]) : undefined;

  if (!['up', 'down'].includes(direction)) {
    throw new Error("Direcao de migration invalida. Use 'up' ou 'down'.");
  }

  const databaseConfig = buildMigrationDatabaseConfig();

  if (direction === 'up') {
    await reconcileLegacyMigrationNames(databaseConfig);
  }

  await runner({
    databaseUrl: databaseConfig,
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
