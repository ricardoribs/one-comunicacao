const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildDatabaseSslConfig,
  hasDatabaseSslCa,
  normalizePemValue,
  readDatabaseSslCa,
} = require('../src/utils/databaseSsl');

test('normalizePemValue converte quebras escapadas em PEM multilinha', () => {
  const pem = '-----BEGIN CERTIFICATE-----\\nlinha-1\\nlinha-2\\n-----END CERTIFICATE-----';

  assert.equal(
    normalizePemValue(pem),
    '-----BEGIN CERTIFICATE-----\nlinha-1\nlinha-2\n-----END CERTIFICATE-----'
  );
});

test('buildDatabaseSslConfig aceita certificado inline sem depender de arquivo', () => {
  const sslConfig = buildDatabaseSslConfig({
    required: true,
    caPem: '-----BEGIN CERTIFICATE-----\\nabc123\\n-----END CERTIFICATE-----',
  });

  assert.deepEqual(sslConfig, {
    ca: '-----BEGIN CERTIFICATE-----\nabc123\n-----END CERTIFICATE-----',
    rejectUnauthorized: true,
  });
});

test('readDatabaseSslCa le certificado do arquivo quando o PEM inline nao foi informado', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-dbssl-'));
  const certPath = path.join(tempDir, 'ca.crt');
  const certContent = '-----BEGIN CERTIFICATE-----\nfrom-file\n-----END CERTIFICATE-----\n';
  fs.writeFileSync(certPath, certContent);

  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  assert.equal(readDatabaseSslCa({ caFilePath: certPath }), certContent);
  assert.equal(hasDatabaseSslCa({ caFilePath: certPath }), true);
});

test('buildDatabaseSslConfig falha quando TLS e obrigatorio sem CA configurado', () => {
  assert.throws(
    () => buildDatabaseSslConfig({ required: true }),
    /DATABASE_SSL_REQUIRED=true exige DATABASE_SSL_CA_FILE ou DATABASE_SSL_CA_PEM configurado\./
  );
});
