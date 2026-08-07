#!/usr/bin/env node
/**
 * Script de backup automatizado do PostgreSQL
 * Uso: node scripts/backup-database.js [--retention=30]
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);

const env = require('../src/config/env');
const logger = require('../src/config/logger');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILENAME = `one-comunicacao-${TIMESTAMP}.sql.gz`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILENAME);

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    logger.info({ backup_dir: BACKUP_DIR }, 'Diretório de backup garantido');
  } catch (error) {
    logger.error({ error: error.message }, 'Falha ao criar diretório de backup');
    throw error;
  }
}

function parseDatabaseUrl(url) {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: urlObj.port || 5432,
    database: urlObj.pathname.slice(1),
    username: urlObj.username,
    password: urlObj.password,
  };
}

async function createBackup() {
  let dbConfig;

  if (env.databaseHost && env.databaseUser && env.databaseName) {
    dbConfig = {
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      username: env.databaseUser,
      password: env.databasePassword,
    };
  } else {
    dbConfig = parseDatabaseUrl(env.databaseUrl);
  }

  const pgDumpEnv = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --no-owner --no-acl --clean --if-exists | gzip > "${BACKUP_PATH}"`;

  logger.info(
    {
      database: dbConfig.database,
      host: dbConfig.host,
      backup_path: BACKUP_PATH,
    },
    'Iniciando backup do banco de dados'
  );

  try {
    const { stdout, stderr } = await execAsync(command, {
      env: pgDumpEnv,
      maxBuffer: 1024 * 1024 * 100,
    });

    if (stderr && !stderr.includes('WARNING')) {
      logger.warn({ stderr }, 'pg_dump gerou avisos');
    }

    const stats = await fs.stat(BACKUP_PATH);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    logger.info(
      {
        backup_file: BACKUP_FILENAME,
        size_mb: sizeMb,
        path: BACKUP_PATH,
      },
      'Backup criado com sucesso'
    );

    return {
      success: true,
      path: BACKUP_PATH,
      size: stats.size,
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stderr: error.stderr,
      },
      'Falha ao criar backup'
    );
    throw error;
  }
}

async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter((f) => f.endsWith('.sql.gz') || f.endsWith('.sql'));

    const now = Date.now();
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filePath);
        deletedCount++;
        logger.info(
          {
            file,
            age_days: Math.floor(age / (24 * 60 * 60 * 1000)),
          },
          'Backup antigo removido'
        );
      }
    }

    if (deletedCount > 0) {
      logger.info(
        {
          deleted_count: deletedCount,
          retention_days: RETENTION_DAYS,
        },
        'Limpeza de backups antigos concluída'
      );
    }
  } catch (error) {
    logger.warn({ error: error.message }, 'Falha na limpeza de backups antigos');
  }
}

async function verifyBackup() {
  try {
    const stats = await fs.stat(BACKUP_PATH);

    if (stats.size < 1024) {
      throw new Error('Arquivo de backup muito pequeno (< 1KB), provavelmente corrompido');
    }

    const command = `gunzip -t "${BACKUP_PATH}"`;
    await execAsync(command);

    logger.info('Backup verificado com sucesso');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Falha na verificação do backup');
    throw error;
  }
}

async function main() {
  try {
    logger.info('=== Iniciando processo de backup ===');

    await ensureBackupDir();
    await createBackup();
    await verifyBackup();
    await cleanupOldBackups();

    logger.info('=== Backup concluído com sucesso ===');
    console.log(`\n✅ Backup criado: ${BACKUP_PATH}\n`);
    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message }, '=== Falha no processo de backup ===');
    console.error(`\n❌ Erro: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup, cleanupOldBackups, verifyBackup };
