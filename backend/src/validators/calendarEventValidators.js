const { z } = require('zod');

const calendarColorEnum = z.enum(['pink', 'blue', 'green', 'gold']);

const dateTimeString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Informe uma data e hora válida.');

const optionalText = (max) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? null : String(value).trim()),
    z.string().max(max).nullable().optional()
  );

exports.calendarEventQuerySchema = z
  .object({
    from: dateTimeString,
    to: dateTimeString,
  })
  .refine(({ from, to }) => new Date(to).getTime() > new Date(from).getTime(), {
    message: 'O período informado para o calendário é inválido.',
    path: ['to'],
  });

exports.calendarEventSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: optionalText(5000),
    starts_at: dateTimeString,
    ends_at: dateTimeString,
    location: optionalText(160),
    color: calendarColorEnum.optional(),
  })
  .refine(({ starts_at, ends_at }) => new Date(ends_at).getTime() > new Date(starts_at).getTime(), {
    message: 'O fim do evento deve acontecer depois do início.',
    path: ['ends_at'],
  });

exports.calendarEventUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: optionalText(5000),
    starts_at: dateTimeString.optional(),
    ends_at: dateTimeString.optional(),
    location: optionalText(160),
    color: calendarColorEnum.optional(),
  })
  .refine(
    (value) =>
      !value.starts_at ||
      !value.ends_at ||
      new Date(value.ends_at).getTime() > new Date(value.starts_at).getTime(),
    {
      message: 'O fim do evento deve acontecer depois do início.',
      path: ['ends_at'],
    }
  );
