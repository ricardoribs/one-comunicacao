const { z } = require('zod');
const { paginationQuerySchema } = require('./commonValidators');

const providerEnum = z.enum(['ga4', 'meta_business', 'search_console', 'power_bi', 'looker_studio']);
const statusEnum = z.enum(['connected', 'configuring', 'error', 'disconnected']);

const nullableString = (max) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().max(max).nullable());

const nullableObject = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return null;
  }
  return value;
}, z.record(z.any()).nullable());

exports.integrationQuerySchema = paginationQuerySchema.extend({
  client_id: z.string().optional(),
  provider_key: providerEnum.optional(),
  status: statusEnum.optional(),
});

exports.integrationSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  provider_key: providerEnum,
  status: statusEnum.default('configuring'),
  external_account_id: nullableString(160).optional(),
  external_property_id: nullableString(160).optional(),
  last_sync_at: nullableString(40).optional(),
  last_error: nullableString(2000).optional(),
  metadata: nullableObject.optional(),
});

exports.integrationUpdateSchema = exports.integrationSchema.partial();
