const { z } = require('zod');

const planEnum = z.enum(['starter', 'growth', 'scale']);
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const zipCodeRegex = /^\d{5}-?\d{3}$/;

const emptyToNullNumber = (schema = z.coerce.number().int().positive()) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullString = (schema = z.string().max(255)) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullDate = () =>
  emptyToNullString(z.string().regex(isoDateRegex, 'Informe uma data valida no formato AAAA-MM-DD'));

const emptyToNullEmail = () => emptyToNullString(z.string().email('Informe um e-mail valido').max(160));

exports.clientSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio').max(120),
  company: z.string().trim().min(2, 'Empresa obrigatoria').max(160),
  plan: planEnum.default('growth').optional(),
  mrr: z.coerce.number().min(0).max(9999999).default(0).optional(),
  segment: emptyToNullString(z.string().max(120)).optional(),
  manager_id: emptyToNullNumber().optional(),
  started_at: emptyToNullDate().optional(),
  legal_document: emptyToNullString(z.string().max(40)).optional(),
  contact_name: emptyToNullString(z.string().max(120)).optional(),
  contact_email: emptyToNullEmail().optional(),
  contact_phone: emptyToNullString(z.string().min(8).max(30)).optional(),
  billing_email: emptyToNullEmail().optional(),
  address_line1: emptyToNullString(z.string().max(180)).optional(),
  address_line2: emptyToNullString(z.string().max(180)).optional(),
  neighborhood: emptyToNullString(z.string().max(120)).optional(),
  city: emptyToNullString(z.string().max(120)).optional(),
  state: emptyToNullString(z.string().length(2)).optional(),
  zip_code: emptyToNullString(z.string().regex(zipCodeRegex, 'Informe um CEP valido')).optional(),
  country: emptyToNullString(z.string().max(80)).optional(),
  notes: emptyToNullString(z.string().max(5000)).optional(),
  brand_manual: emptyToNullString(z.string().max(10000)).optional(),
});

exports.clientUpdateSchema = exports.clientSchema.partial();
