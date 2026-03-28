const { z } = require('zod');

exports.notificationQuerySchema = z.object({
  limit: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).max(100).optional()
  ),
  unread: z.enum(['true', 'false']).optional(),
});
