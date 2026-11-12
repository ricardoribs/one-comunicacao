const { z } = require('zod');
const { CLIENT_PLAN_OPTIONS, normalizeClientPlan } = require('../utils/clientPlans');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const zipCodeRegex = /^\d{5}-?\d{3}$/;
const leadStageEnum = z.enum(['Prospeccao', 'Contato feito', 'Proposta', 'Negociacao', 'Fechado']);

const emptyToNullNumber = (schema = z.coerce.number().int().positive()) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullString = (schema = z.string().max(255)) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullDate = () =>
  emptyToNullString(z.string().regex(isoDateRegex, 'Informe uma data válida no formato AAAA-MM-DD.'));

const emptyToNullDateTime = () =>
  emptyToNullString(z.string().regex(isoDateTimeLocalRegex, 'Informe uma data e hora válidas.'));

exports.contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  whatsapp: emptyToNullString(z.string().min(8).max(30)).optional(),
  email: z.string().trim().email('Informe um e-mail válido.').max(160),
  company: emptyToNullString(z.string().max(160)).optional(),
  service: emptyToNullString(z.string().max(120)).optional(),
  source: emptyToNullString(z.string().max(120)).optional(),
  document: emptyToNullString(z.string().max(40)).optional(),
  lead_stage: z.preprocess((value) => (value === '' || value === undefined ? null : value), leadStageEnum.nullable()).optional(),
  estimated_value: z.coerce.number().min(0).max(9999999).optional().nullable(),
  message: emptyToNullString(z.string().max(5000)).optional(),
  notes: emptyToNullString(z.string().max(5000)).optional(),
  owner_id: emptyToNullNumber().optional(),
  assigned_to: emptyToNullNumber().optional(),
  birth_date: emptyToNullDate().optional(),
  address_line1: emptyToNullString(z.string().max(180)).optional(),
  address_line2: emptyToNullString(z.string().max(180)).optional(),
  neighborhood: emptyToNullString(z.string().max(120)).optional(),
  city: emptyToNullString(z.string().max(120)).optional(),
  state: emptyToNullString(z.string().length(2)).optional(),
  zip_code: emptyToNullString(z.string().regex(zipCodeRegex, 'Informe um CEP válido.')).optional(),
  country: emptyToNullString(z.string().max(80)).optional(),
  last_contact_at: emptyToNullDateTime().optional(),
});

exports.contactUpdateSchema = exports.contactSchema.partial();

exports.contactConvertSchema = z.object({
  manager_id: emptyToNullNumber().optional(),
  plan: z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) {
      return undefined;
    }

    return normalizeClientPlan(value);
  }, z.enum(CLIENT_PLAN_OPTIONS).optional()),
  mrr: z.coerce.number().min(0).max(9999999).optional(),
  segment: emptyToNullString(z.string().max(120)).optional(),
});
