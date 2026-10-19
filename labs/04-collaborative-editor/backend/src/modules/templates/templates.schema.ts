import { z } from 'zod';

export const TemplateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  fileType: z.enum(['tex', 'style', 'bib', 'image', 'other']),
  isMain: z.boolean().default(false),
  storageKey: z.string().optional(),
});

export type TemplateFile = z.infer<typeof TemplateFileSchema>;

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.string(),
  filesCount: z.number().int().nonnegative(),
  hasCls: z.boolean(),
  createdAt: z.string(),
});

export type Template = z.infer<typeof TemplateSchema>;

export const TemplateDetailSchema = TemplateSchema.extend({
  files: z.array(TemplateFileSchema),
});

export type TemplateDetail = z.infer<typeof TemplateDetailSchema>;

export const GetTemplateParamsSchema = z.object({
  templateId: z.string(),
});

export const CreateTemplateBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('custom'),
  mainContent: z.string().min(1),
  clsContent: z.string().optional(),
  clsFileName: z.string().optional().default('custom.cls'),
});

export type CreateTemplateBody = z.infer<typeof CreateTemplateBodySchema>;
