const { z } = require('zod');

exports.cepParamSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'Informe um CEP valido.'),
});
