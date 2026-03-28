const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRequestAccessMetadata } = require('../src/utils/requestMetadata');

test('resolveRequestAccessMetadata usa lookup por IP publico quando nao ha header geografico', async (t) => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({
        success: true,
        city: 'Sao Paulo',
        region: 'SP',
        country_code: 'BR',
      }),
    };
  };

  const metadata = await resolveRequestAccessMetadata({
    headers: {
      'x-forwarded-for': '8.8.8.8',
      'user-agent': 'node-test',
    },
    ip: '8.8.8.8',
  });

  assert.equal(fetchCalls, 1);
  assert.equal(metadata.ip, '8.8.8.8');
  assert.equal(metadata.location, 'Sao Paulo, SP');
});

test('resolveRequestAccessMetadata nao consulta geolocalizacao para IP privado', async (t) => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch nao deveria ser chamado');
  };

  const metadata = await resolveRequestAccessMetadata({
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'node-test',
    },
    ip: '127.0.0.1',
  });

  assert.equal(fetchCalls, 0);
  assert.equal(metadata.location, '');
});
