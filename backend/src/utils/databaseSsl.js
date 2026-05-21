const fs = require('fs');

function normalizePemValue(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.replace(/\\n/g, '\n');
}

function hasDatabaseSslCa({ caFilePath = '', caPem = '' } = {}) {
  return Boolean(normalizePemValue(caPem) || String(caFilePath || '').trim());
}

function readDatabaseSslCa({
  caFilePath = '',
  caPem = '',
  missingFileLabel = 'DATABASE_SSL_CA_FILE',
  secretDirectory = '/etc/secrets',
} = {}) {
  const inlinePem = normalizePemValue(caPem);
  if (inlinePem) {
    return inlinePem;
  }

  const normalizedPath = String(caFilePath || '').trim();
  if (!normalizedPath) {
    return '';
  }

  if (!fs.existsSync(normalizedPath)) {
    let availableSecretFiles = '(nenhum)';

    try {
      const secretFiles = fs.readdirSync(secretDirectory);
      if (secretFiles.length > 0) {
        availableSecretFiles = secretFiles.join(', ');
      }
    } catch {
      availableSecretFiles = `(nao foi possivel listar ${secretDirectory})`;
    }

    throw new Error(
      `${missingFileLabel} nao encontrado: ${normalizedPath}. Arquivos visiveis em ${secretDirectory}: ${availableSecretFiles}`
    );
  }

  return fs.readFileSync(normalizedPath, 'utf8');
}

function buildDatabaseSslConfig({
  required = false,
  caFilePath = '',
  caPem = '',
  missingConfigMessage = 'DATABASE_SSL_REQUIRED=true exige DATABASE_SSL_CA_FILE ou DATABASE_SSL_CA_PEM configurado.',
  missingFileLabel = 'DATABASE_SSL_CA_FILE',
} = {}) {
  const ca = readDatabaseSslCa({
    caFilePath,
    caPem,
    missingFileLabel,
  });

  if (required && !ca) {
    throw new Error(missingConfigMessage);
  }

  if (!ca) {
    return null;
  }

  return {
    ca,
    rejectUnauthorized: true,
  };
}

module.exports = {
  buildDatabaseSslConfig,
  hasDatabaseSslCa,
  normalizePemValue,
  readDatabaseSslCa,
};
