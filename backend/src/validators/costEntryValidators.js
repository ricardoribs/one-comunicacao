const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const costCategoryEnum = z.enum(['media', 'producao', 'operacao', 'outro']);
const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? null : Number(value)),
    z.number().int().positive().nullable()
  );

const emptyToNullDate = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().regex(isoDateRegex, 'Informe uma data válida no formato AAAA-MM-DD.').nullable()
  );

exports.costEntrySchema = z.object({
  client_id: emptyToNullNumber().optional(),
  category: costCategoryEnum,
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive().max(9999999),
  incurred_on: emptyToNullDate().optional(),
});
