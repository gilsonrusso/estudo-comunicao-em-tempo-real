export interface ProjectFile {
  id: string;
  name: string;
  type: 'tex' | 'bib' | 'image' | 'folder' | 'other';
  isMain?: boolean;
  sizeBytes?: number;
  mimeType?: string;
  storageKey?: string;
  content?: string | null;
}

export interface RawProjectFile {
  id: string;
  documentId: string;
  path: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string | null;
  content: string | null;
  createdAt: string;
}

export interface CreateProjectFileDTO {
  path: string;
  content?: string;
}
