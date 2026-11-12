const { z } = require('zod');

const optionalInt = (schema) =>
  z.preprocess((value) => (value === '' || value === undefined ? undefined : value), schema.optional());

const paginationQuerySchema = z.object({
  limit: optionalInt(z.coerce.number().int().positive().max(100)),
  offset: optionalInt(z.coerce.number().int().min(0)),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const emptyBodySchema = z.object({}).strict();
const emptyQuerySchema = z.object({}).strict();

module.exports = {
  paginationQuerySchema,
  idParamSchema,
  emptyBodySchema,
  emptyQuerySchema,
};
