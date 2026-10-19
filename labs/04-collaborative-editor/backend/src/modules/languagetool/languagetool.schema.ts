import { z } from 'zod';

export const LanguageToolReplacementSchema = z.object({
  value: z.string(),
});

export const LanguageToolRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  issueType: z.string().optional(),
  category: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export const LanguageToolMatchSchema = z.object({
  message: z.string(),
  shortMessage: z.string().optional(),
  offset: z.number(),
  length: z.number(),
  rule: LanguageToolRuleSchema,
  replacements: z.array(LanguageToolReplacementSchema),
});

export const CheckTextBodySchema = z.object({
  text: z.string(),
  language: z.string().default('pt-BR'),
});

export const CheckTextResponseSchema = z.object({
  matches: z.array(LanguageToolMatchSchema),
  status: z.enum(['ok', 'unavailable']),
  message: z.string().optional(),
});

export const LanguageToolStatusResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  endpoint: z.string(),
  version: z.string().optional(),
});

export type CheckTextBody = z.infer<typeof CheckTextBodySchema>;
export type CheckTextResponse = z.infer<typeof CheckTextResponseSchema>;
export type LanguageToolMatch = z.infer<typeof LanguageToolMatchSchema>;
export type LanguageToolStatusResponse = z.infer<typeof LanguageToolStatusResponseSchema>;
