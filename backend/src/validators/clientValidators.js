const { z } = require('zod');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = () =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable());

exports.clientSchema = z.object({
  name: z.string().min(2, 'Nome obrigatorio'),
  company: z.string().min(2, 'Empresa obrigatoria'),
  plan: z.string().default('growth').optional(),
  mrr: z.coerce.number().min(0).default(0).optional(),
  segment: emptyToNullString().optional(),
  manager_id: emptyToNullNumber().optional(),
  started_at: emptyToNullString().optional(),
  legal_document: emptyToNullString().optional(),
  contact_name: emptyToNullString().optional(),
  contact_email: emptyToNullString().optional(),
  contact_phone: emptyToNullString().optional(),
  billing_email: emptyToNullString().optional(),
  address_line1: emptyToNullString().optional(),
  address_line2: emptyToNullString().optional(),
  neighborhood: emptyToNullString().optional(),
  city: emptyToNullString().optional(),
  state: emptyToNullString().optional(),
  zip_code: emptyToNullString().optional(),
  country: emptyToNullString().optional(),
  notes: emptyToNullString().optional(),
});

exports.clientUpdateSchema = exports.clientSchema.partial();
