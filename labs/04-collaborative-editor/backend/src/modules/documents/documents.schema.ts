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

export const CollabUpdateSchema = z.object({
  clientID: z.string(),
  changes: z.unknown(),
});

export type CollabUpdate = z.infer<typeof CollabUpdateSchema>;

export const PushUpdatesSchema = z.object({
  file: z.string().default('main.tex'),
  version: z.number(),
  updates: z.array(CollabUpdateSchema),
});

export type PushUpdates = z.infer<typeof PushUpdatesSchema>;

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
  templateId: z.string().optional(),
  initialContent: z.string().optional(),
});

export const ProjectFileSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  path: z.string(),
  fileType: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  storageKey: z.string().nullable(),
  content: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type ProjectFile = z.infer<typeof ProjectFileSchema>;

export const FileParamsSchema = z.object({
  documentId: z.string(),
  fileId: z.string(),
});

export const UpdateFileContentBodySchema = z.object({
  content: z.string(),
});

export const CreateFileBodySchema = z.object({
  path: z.string().min(1),
  content: z.string().default(''),
});

export const CommentReplySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userColor: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export type CommentReply = z.infer<typeof CommentReplySchema>;

export const ReviewCommentSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  file: z.string(),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  selectedText: z.string(),
  userId: z.string(),
  userName: z.string(),
  userColor: z.string(),
  content: z.string(),
  status: z.enum(['open', 'resolved']),
  createdAt: z.string(),
  replies: z.array(CommentReplySchema).default([]),
});

export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
