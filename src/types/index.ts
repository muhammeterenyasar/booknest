export type FileType = 'epub' | 'pdf';

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  file_path?: string; // or blob URL in web
  file_blob?: Blob | ArrayBuffer;
  file_type: FileType;
  file_size: number;
  has_file: number; // 1 if file loaded, 0 if metadata only
  current_page: number;
  total_pages: number;
  epub_cfi?: string;
  progress_percent: number;
  created_at: number;
  last_read_at?: number;
}

export interface GoogleBookVolume {
  id: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  thumbnail?: string;
  language?: string;
  infoLink?: string;
}

export type ReadingTheme = 'dark' | 'light' | 'sepia';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface BookNote {
  id: string;
  book_id: string;
  page: number;
  cfi?: string;
  highlight_text?: string;
  note_text: string;
  color: HighlightColor;
  created_at: number;
  updated_at: number;
}

export type SortOption = 'last_read' | 'title' | 'author' | 'progress';

export interface CodeFile {
  filename: string;
  path: string;
  language: string;
  code: string;
  description: string;
}
