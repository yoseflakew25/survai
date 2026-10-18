import * as z from 'zod';

export const newSurveySchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be under 200 characters'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(500, 'Description must be under 500 characters'),
  researchGoal: z
    .string()
    .min(10, 'Research goal must be at least 10 characters for better AI results')
    .max(2000, 'Research goal must be under 2,000 characters'),
  startMethod: z.literal('ai').optional()
});

export type NewSurveyValues = z.infer<typeof newSurveySchema>;
