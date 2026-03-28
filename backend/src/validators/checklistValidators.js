const { z } = require('zod');

const checklistItemSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  done: z.boolean(),
  createdAt: z.string().optional(),
});

const dailyChecklistUpdateSchema = z.object({
  items: z.array(checklistItemSchema).max(100),
});

module.exports = {
  dailyChecklistUpdateSchema,
};
