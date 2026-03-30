const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const chargeStatusEnum = z.enum(['PENDING', 'RECEIVED', 'PAID', 'OVERDUE', 'CANCELLED']);

const emptyToNullNumber = (schema = z.coerce.number().int().positive()) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullString = (schema = z.string().max(255)) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullDate = () =>
  emptyToNullString(z.string().regex(isoDateRegex, 'Informe uma data válida no formato AAAA-MM-DD.'));

exports.chargeSchema = z
  .object({
    client_id: emptyToNullNumber().optional(),
    contact_id: emptyToNullNumber().optional(),
    payment_method: z.enum(['BOLETO', 'PIX', 'PAYMENT_LINK']),
    description: z.string().trim().min(3).max(500),
    amount: z.coerce.number().positive().max(9999999),
    due_date: emptyToNullDate().optional(),
    external_reference: emptyToNullString(z.string().max(120)).optional(),
    idempotency_key: emptyToNullString(z.string().max(120)).optional(),
  })
  .refine((payload) => payload.client_id || payload.contact_id, {
    message: 'Informe client_id ou contact_id para gerar a cobrança.',
    path: ['client_id'],
  });

exports.chargeUpdateSchema = z.object({
  status: chargeStatusEnum.optional(),
  payment_link: emptyToNullString(z.string().url('Informe uma URL válida.').max(500)).optional(),
  boleto_url: emptyToNullString(z.string().url('Informe uma URL válida.').max(500)).optional(),
  boleto_barcode: emptyToNullString(z.string().max(255)).optional(),
  pix_copy_paste: emptyToNullString(z.string().max(5000)).optional(),
  pix_qr_base64: emptyToNullString(z.string().max(20000)).optional(),
  external_payload: z.unknown().optional(),
});
