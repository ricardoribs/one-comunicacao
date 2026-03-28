const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const invoiceStatusEnum = z.enum(['Em aberto', 'Pago', 'Atrasado', 'Cancelado']);

const emptyToNullDate = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().regex(isoDateRegex, 'Informe uma data valida no formato AAAA-MM-DD').nullable()
  );

exports.invoiceSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().min(0).max(9999999),
  status: invoiceStatusEnum,
  due_date: emptyToNullDate().optional(),
});

exports.invoiceUpdateSchema = exports.invoiceSchema.partial();

exports.invoiceStatusSchema = z.object({
  status: invoiceStatusEnum,
});
