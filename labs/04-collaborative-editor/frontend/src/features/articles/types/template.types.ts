export interface TemplateFile {
  path: string;
  content?: string;
  fileType: 'tex' | 'style' | 'bib' | 'image' | 'other';
  isMain?: boolean;
}

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  filesCount: number;
  hasCls: boolean;
  createdAt: string;
}

export interface TemplateDetail extends TemplateItem {
  files: TemplateFile[];
}

export interface CreateTemplateDTO {
  name: string;
  description?: string;
  category?: string;
  mainContent: string;
  clsContent?: string;
  clsFileName?: string;
}
