import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const DeltaOperationSchema = z.object({
  type: z.enum(['insert', 'delete']),
  position: z.number().int().nonnegative(),
  text: z.string().optional(),
  length: z.number().int().positive().optional(),
  userId: z.string(),
  userName: z.string(),
  timestamp: z.number().default(() => Date.now()),
});

export type DeltaOperation = z.infer<typeof DeltaOperationSchema>;

export const DocumentOperationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  userName: z.string(),
  type: z.enum(['insert', 'delete']),
  position: z.number(),
  text: z.string().optional(),
  length: z.number().optional(),
  timestamp: z.number(),
});

export type DocumentOperation = z.infer<typeof DocumentOperationSchema>;

export const DocumentSnapshotSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.number(),
  content: z.string(),
  savedBy: z.string(),
  reason: z.string().default('checkpoint_debounce'),
  createdAt: z.string(),
});

export type DocumentSnapshot = z.infer<typeof DocumentSnapshotSchema>;

// Schemas para Rotas REST
export const GetDocumentParamsSchema = z.object({
  documentId: z.string(),
});

export const UpdateDocumentTitleBodySchema = z.object({
  title: z.string().min(1),
});

export const CreateDocumentBodySchema = z.object({
  title: z.string().min(1),
  initialContent: z.string().default(''),
});
