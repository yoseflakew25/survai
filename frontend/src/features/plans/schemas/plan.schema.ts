import * as z from 'zod';

export const createPlanSchema = z.object({
  researchGoal: z
    .string()
    .min(10, 'Research goal must be at least 10 characters')
    .max(2000, 'Research goal must be under 2,000 characters')
    .describe(
      'Describe the purpose of your survey — what you want to learn, why it matters, and who will benefit from the findings.'
    )
});

export type CreatePlanValues = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  researchGoal: z
    .string()
    .min(10, 'Research goal must be at least 10 characters')
    .max(2000, 'Research goal must be under 2,000 characters')
    .optional(),
  objectives: z.array(z.string().min(1, 'Objective cannot be empty')).optional(),
  researchQuestions: z
    .array(z.string().min(1, 'Question cannot be empty'))
    .optional(),
  targetRespondents: z
    .array(z.string().min(1, 'Respondent type cannot be empty'))
    .optional()
});

export type UpdatePlanValues = z.infer<typeof updatePlanSchema>;
