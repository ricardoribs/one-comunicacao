const { z } = require('zod');
const { paginationQuerySchema } = require('./commonValidators');

exports.messageSchema = z.object({
  receiver_id: z.coerce.number().int().positive(),
  context_type: z.string().default('general').optional(),
  context_id: z.coerce.number().int().positive().optional().nullable(),
  content: z.string().min(1),
});

exports.messageReadSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(100).optional(),
  context_type: z.string().optional(),
  context_id: z.coerce.number().int().positive().optional().nullable(),
});

exports.messageQuerySchema = paginationQuerySchema.extend({
  context_type: z.string().optional(),
  context_id: z.string().optional(),
});
