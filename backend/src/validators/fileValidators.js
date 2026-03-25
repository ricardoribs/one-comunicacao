const { z } = require('zod');
const { paginationQuerySchema, idParamSchema } = require('./commonValidators');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const fileUploadSchema = z.object({
  client_id: emptyToNullNumber().optional(),
});

module.exports = {
  fileQuerySchema: paginationQuerySchema,
  fileIdParamSchema: idParamSchema,
  fileUploadSchema,
};
