import * as pdfjsLib from 'pdfjs-dist';
import { Book, FileType } from '../types';

// Configure pdfjs worker URL
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface FilePickResult {
  id: string;
  title: string;
  author: string;
  file_type: FileType;
  file_size: number;
  total_pages: number;
  data: Blob;
  name: string;
}

export async function getPdfPageCount(file: Blob): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    if (pdfDoc && pdfDoc.numPages > 0) {
      return pdfDoc.numPages;
    }
  } catch (err) {
    console.warn('pdfjs failed to get page count from blob, using binary fallback:', err);
  }

  // Binary fallback if worker unavailable
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let text = '';
    const chunkSize = 16384;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      text += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const pagesObjMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]{1,1000}?\/Count\s+(\d+)/g)];
    if (pagesObjMatches.length > 0) {
      const counts = pagesObjMatches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n) && n > 0);
      if (counts.length > 0) return Math.max(...counts);
    }

    const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)];
    if (countMatches.length > 0) {
      const counts = countMatches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n) && n > 0);
      if (counts.length > 0) return Math.max(...counts);
    }
  } catch (e) {
    console.warn('Fallback error:', e);
  }
  return 300;
}

export async function processImportedFile(file: File): Promise<FilePickResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const fileType: FileType = extension === 'pdf' ? 'pdf' : 'epub';

  let totalPages = 200;
  if (fileType === 'pdf') {
    totalPages = await getPdfPageCount(file);
  }

  // Clean raw filename into title candidate
  const cleanName = file.name.replace(/\.(epub|pdf)$/i, '').replace(/[_-]/g, ' ');
  
  return {
    id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: cleanName || 'Untitled Book',
    author: 'Unknown Author',
    file_type: fileType,
    file_size: file.size,
    total_pages: totalPages,
    data: file,
    name: file.name
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
