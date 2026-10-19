export interface Collaborator {
  userId: string;
  userName: string;
  color: string;
  position?: number;
  file?: string;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
  lastActive: number;
  file?: string;
}

export interface DeltaOperation {
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  version: number;
  content: string;
  savedBy: string;
  reason: string;
  createdAt: string;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
}

export type SaveStatus = 'synced' | 'pending_debounce' | 'saving';

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  documentId: string;
  file: string;
  from: number;
  to: number;
  selectedText: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  status: 'open' | 'resolved';
  createdAt: string;
  replies: CommentReply[];
}
