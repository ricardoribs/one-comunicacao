const { z } = require('zod');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = () =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable());

exports.contactSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  whatsapp: emptyToNullString().optional(),
  email: z.string().email(),
  company: emptyToNullString().optional(),
  service: emptyToNullString().optional(),
  source: emptyToNullString().optional(),
  document: emptyToNullString().optional(),
  lead_stage: emptyToNullString().optional(),
  estimated_value: z.coerce.number().min(0).optional().nullable(),
  message: emptyToNullString().optional(),
  notes: emptyToNullString().optional(),
  owner_id: emptyToNullNumber().optional(),
  assigned_to: emptyToNullNumber().optional(),
  birth_date: emptyToNullString().optional(),
  address_line1: emptyToNullString().optional(),
  address_line2: emptyToNullString().optional(),
  neighborhood: emptyToNullString().optional(),
  city: emptyToNullString().optional(),
  state: emptyToNullString().optional(),
  zip_code: emptyToNullString().optional(),
  country: emptyToNullString().optional(),
  last_contact_at: emptyToNullString().optional(),
});

exports.contactUpdateSchema = exports.contactSchema.partial();

exports.contactConvertSchema = z.object({
  manager_id: emptyToNullNumber().optional(),
  plan: emptyToNullString().optional(),
  mrr: z.coerce.number().min(0).optional(),
  segment: emptyToNullString().optional(),
  started_at: emptyToNullString().optional(),
});
