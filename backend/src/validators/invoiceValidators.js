const { z } = require('zod');

exports.invoiceSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().min(0),
  status: z.string().min(2),
  due_date: z.string().optional().nullable(),
});

exports.invoiceUpdateSchema = exports.invoiceSchema.partial();

exports.invoiceStatusSchema = z.object({
  status: z.string().min(2),
});
