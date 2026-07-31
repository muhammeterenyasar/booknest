import { Book, BookNote } from '../types';
import { INITIAL_SAMPLE_BOOKS } from '../data/sampleBooks';

const DB_NAME = 'BookNestDB';
const DB_VERSION = 2;
const STORE_NAME = 'books';
const FILE_STORE_NAME = 'book_files';
const NOTES_STORE_NAME = 'book_notes';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const bookStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          bookStore.createIndex('last_read_at', 'last_read_at', { unique: false });
          bookStore.createIndex('title', 'title', { unique: false });
        }
        if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
          db.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
          const noteStore = db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
          noteStore.createIndex('book_id', 'book_id', { unique: false });
          noteStore.createIndex('page', 'page', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async initDatabase(): Promise<Book[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = async () => {
          let books: Book[] = request.result || [];
          if (books.length === 0) {
            // Seed initial sample books
            for (const b of INITIAL_SAMPLE_BOOKS) {
              await this.addBook(b);
            }
            books = [...INITIAL_SAMPLE_BOOKS];
          }
          // Sort by last_read_at DESC
          books.sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));
          resolve(books);
        };
        request.onerror = () => resolve(INITIAL_SAMPLE_BOOKS);
      });
    } catch {
      return INITIAL_SAMPLE_BOOKS;
    }
  }

  async getAllBooks(): Promise<Book[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const books: Book[] = request.result || [];
          books.sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));
          resolve(books);
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async getBookById(id: string): Promise<Book | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async addBook(book: Book, fileData?: Blob | ArrayBuffer): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAME, FILE_STORE_NAME], 'readwrite');
    const bookStore = transaction.objectStore(STORE_NAME);
    const fileStore = transaction.objectStore(FILE_STORE_NAME);

    bookStore.put(book);

    if (fileData) {
      fileStore.put({ id: book.id, data: fileData, type: book.file_type });
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getBookFile(id: string): Promise<{ data: Blob | ArrayBuffer; type: string } | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([FILE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(FILE_STORE_NAME);
      const request = store.get(id);

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async updateReadingProgress(
    id: string,
    currentPage: number,
    totalPages: number,
    epubCfi?: string
  ): Promise<void> {
    const book = await this.getBookById(id);
    if (!book) return;

    const progress = Math.min(100, Math.max(0, (currentPage / Math.max(1, totalPages)) * 100));
    const updatedBook: Book = {
      ...book,
      current_page: currentPage,
      total_pages: totalPages,
      epub_cfi: epubCfi ?? book.epub_cfi,
      progress_percent: parseFloat(progress.toFixed(1)),
      last_read_at: Date.now(),
    };

    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).put(updatedBook);
  }

  async updateBookMetadata(id: string, metadata: Partial<Book>): Promise<void> {
    const book = await this.getBookById(id);
    if (!book) return;

    const updatedBook: Book = {
      ...book,
      ...metadata,
    };

    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).put(updatedBook);
  }

  async attachBookFile(
    id: string,
    fileData: Blob | File,
    fileType: 'epub' | 'pdf',
    fileSize: number,
    totalPages?: number
  ): Promise<Book | null> {
    const book = await this.getBookById(id);
    if (!book) return null;

    const finalTotalPages = totalPages && totalPages > 0 ? totalPages : (book.total_pages || 300);
    const progressPercent = parseFloat((((book.current_page || 1) / finalTotalPages) * 100).toFixed(1));

    const updatedBook: Book = {
      ...book,
      has_file: 1,
      file_type: fileType,
      file_size: fileSize,
      total_pages: finalTotalPages,
      progress_percent: Math.min(100, progressPercent),
    };

    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAME, FILE_STORE_NAME], 'readwrite');
    const bookStore = transaction.objectStore(STORE_NAME);
    const fileStore = transaction.objectStore(FILE_STORE_NAME);

    bookStore.put(updatedBook);
    fileStore.put({ id: book.id, data: fileData, type: fileType });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(updatedBook);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteBook(id: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAME, FILE_STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.objectStore(FILE_STORE_NAME).delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- Notes & Highlights Storage ---
  async getNotesForBook(bookId: string): Promise<BookNote[]> {
    try {
      const db = await this.getDB();
      if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) return [];

      const transaction = db.transaction([NOTES_STORE_NAME], 'readonly');
      const store = transaction.objectStore(NOTES_STORE_NAME);
      const index = store.index('book_id');
      const request = index.getAll(bookId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const notes: BookNote[] = request.result || [];
          notes.sort((a, b) => a.page - b.page || b.created_at - a.created_at);
          resolve(notes);
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveNote(note: BookNote): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([NOTES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(NOTES_STORE_NAME);
    store.put(note);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([NOTES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(NOTES_STORE_NAME);
    store.delete(noteId);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const dbService = new StorageService();
