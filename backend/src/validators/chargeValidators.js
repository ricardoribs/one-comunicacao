const { z } = require('zod');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = () =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable());

exports.chargeSchema = z
  .object({
    client_id: emptyToNullNumber().optional(),
    contact_id: emptyToNullNumber().optional(),
    payment_method: z.enum(['BOLETO', 'PIX', 'PAYMENT_LINK']),
    description: z.string().min(3),
    amount: z.coerce.number().positive(),
    due_date: emptyToNullString().optional(),
    external_reference: emptyToNullString().optional(),
    idempotency_key: emptyToNullString().optional(),
  })
  .refine((payload) => payload.client_id || payload.contact_id, {
    message: 'Informe client_id ou contact_id para gerar a cobranca.',
    path: ['client_id'],
  });

exports.chargeUpdateSchema = z.object({
  status: z.string().min(2).optional(),
  payment_link: emptyToNullString().optional(),
  boleto_url: emptyToNullString().optional(),
  boleto_barcode: emptyToNullString().optional(),
  pix_copy_paste: emptyToNullString().optional(),
  pix_qr_base64: emptyToNullString().optional(),
  external_payload: z.any().optional(),
});
