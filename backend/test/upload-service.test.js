const test = require('node:test');
const assert = require('node:assert/strict');

const uploadService = require('../src/services/uploadService');

test('inferCloudinaryResourceType trata PDF como image para private download', () => {
  assert.equal(uploadService.__private.inferCloudinaryResourceType('application/pdf'), 'image');
});

test('inferCloudinaryResourceType mantem raw para arquivos office compactados', () => {
  assert.equal(
    uploadService.__private.inferCloudinaryResourceType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'raw'
  );
  assert.equal(uploadService.__private.inferCloudinaryResourceType('application/zip'), 'raw');
});
