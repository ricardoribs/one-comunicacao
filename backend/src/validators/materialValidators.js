const { z } = require('zod');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = () =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable());

exports.materialSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  campaign_id: emptyToNullNumber().optional(),
  uploaded_by: emptyToNullNumber().optional(),
  title: z.string().min(2),
  filename: emptyToNullString().optional(),
  url: emptyToNullString().optional(),
  status: z.enum(['Pendente', 'Aprovado', 'Revisao', 'Rejeitado']),
  feedback: emptyToNullString().optional(),
});

exports.materialUpdateSchema = exports.materialSchema.partial();

exports.materialStatusSchema = z.object({
  status: z.enum(['Pendente', 'Aprovado', 'Revisao', 'Rejeitado']),
  feedback: emptyToNullString().optional(),
});
