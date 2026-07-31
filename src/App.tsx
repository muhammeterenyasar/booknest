import React, { useEffect, useRef, useState } from 'react';
import { Book } from './types';
import { dbService } from './db/storage';
import { processImportedFile, getPdfPageCount } from './services/fileService';
import { Navbar } from './components/Navbar';
import { LibraryView } from './screens/LibraryView';
import { ReadingHistoryView } from './screens/ReadingHistoryView';
import { BookSearchView } from './screens/BookSearchView';
import { EpubReaderModal } from './components/EpubReaderModal';
import { PdfReaderModal } from './components/PdfReaderModal';
import { BookDetailModal } from './components/BookDetailModal';
import { MetadataEnrichModal } from './components/MetadataEnrichModal';
import { ExpoExporterModal } from './components/ExpoExporterModal';
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeView, setActiveView] = useState<'library' | 'history' | 'search'>('library');
  const [activeReaderBook, setActiveReaderBook] = useState<Book | null>(null);
  const [selectedDetailBook, setSelectedDetailBook] = useState<Book | null>(null);
  const [enrichBook, setEnrichBook] = useState<Book | null>(null);
  const [showExporterModal, setShowExporterModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize database and load books
  useEffect(() => {
    async function loadData() {
      const loadedBooks = await dbService.initDatabase();
      setBooks(loadedBooks);
    }
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRefreshBooks = async () => {
    const updated = await dbService.getAllBooks();
    setBooks(updated);
  };

  // Handle local file import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const processed = await processImportedFile(file);
        const newBook: Book = {
          id: processed.id,
          title: processed.title,
          author: processed.author,
          file_type: processed.file_type,
          file_size: processed.file_size,
          has_file: 1,
          current_page: 1,
          total_pages: processed.total_pages || (processed.file_type === 'pdf' ? 300 : 200),
          progress_percent: 0,
          created_at: Date.now(),
          last_read_at: Date.now(),
        };

        await dbService.addBook(newBook, processed.data);
        showToast(`Imported "${newBook.title}" (${newBook.total_pages} pages) successfully!`);
      } catch (err) {
        console.error('Import error:', err);
      }
    }

    await handleRefreshBooks();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.epub') || file.name.endsWith('.pdf')) {
          const processed = await processImportedFile(file);
          const newBook: Book = {
            id: processed.id,
            title: processed.title,
            author: processed.author,
            file_type: processed.file_type,
            file_size: processed.file_size,
            has_file: 1,
            current_page: 1,
            total_pages: processed.total_pages || (processed.file_type === 'pdf' ? 300 : 200),
            progress_percent: 0,
            created_at: Date.now(),
            last_read_at: Date.now(),
          };
          await dbService.addBook(newBook, processed.data);
          showToast(`Imported "${newBook.title}" (${newBook.total_pages} pages)!`);
        }
      }
      await handleRefreshBooks();
    }
  };

  // Add book from Google Books
  const handleAddBookFromSearch = async (book: Book) => {
    await dbService.addBook(book);
    await handleRefreshBooks();
    showToast(`Added "${book.title}" to library! Select it to match an EPUB or PDF file.`);
  };

  // Attach/match an EPUB or PDF file to an existing book record
  const handleAttachFileToBook = async (bookId: string, file: File): Promise<Book | void> => {
    const ext = file.name.split('.').pop()?.toLowerCase() === 'pdf' ? 'pdf' : 'epub';
    let totalPages: number | undefined;
    if (ext === 'pdf') {
      totalPages = await getPdfPageCount(file);
    }
    const updatedBook = await dbService.attachBookFile(bookId, file, ext, file.size, totalPages);
    await handleRefreshBooks();
    showToast(`Matched "${file.name}" (${updatedBook?.total_pages || 'N/A'} pages) with book successfully!`);
    return updatedBook || undefined;
  };

  // Safe read handler - prompts for file match if book has no file attached
  const handleReadBookWithCheck = (book: Book) => {
    if (book.has_file === 0 && !book.file_path) {
      setSelectedDetailBook(book);
      showToast(`Please attach an EPUB or PDF file to read "${book.title}".`);
    } else {
      setActiveReaderBook(book);
    }
  };

  // Apply metadata from Google Books
  const handleApplyMetadata = async (bookId: string, metadata: Partial<Book>) => {
    await dbService.updateBookMetadata(bookId, metadata);
    await handleRefreshBooks();
    showToast('Updated book metadata successfully!');
    if (selectedDetailBook && selectedDetailBook.id === bookId) {
      setSelectedDetailBook({ ...selectedDetailBook, ...metadata });
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId: string) => {
    await dbService.deleteBook(bookId);
    await handleRefreshBooks();
    setSelectedDetailBook(null);
    showToast('Book deleted from library.');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#121318] text-gray-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white"
    >
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-900/90 backdrop-blur-md border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center text-white pointer-events-none">
          <UploadCloud className="w-20 h-20 mb-4 animate-bounce text-indigo-200" />
          <h2 className="text-2xl font-bold">Drop EPUB or PDF Files Here</h2>
          <p className="text-sm text-indigo-200 mt-2">BookNest will add them directly to your local library.</p>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeView={activeView}
        onSelectView={setActiveView}
        onImportClick={() => fileInputRef.current?.click()}
        onOpenExporter={() => setShowExporterModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        {activeView === 'library' && (
          <LibraryView
            books={books}
            onSelectBook={setSelectedDetailBook}
            onReadBook={handleReadBookWithCheck}
            onEnrichBook={setEnrichBook}
            onImportClick={() => fileInputRef.current?.click()}
          />
        )}
        {activeView === 'history' && (
          <ReadingHistoryView
            books={books}
            onSelectBook={setSelectedDetailBook}
            onReadBook={handleReadBookWithCheck}
          />
        )}
        {activeView === 'search' && (
          <BookSearchView onAddBookToLibrary={handleAddBookFromSearch} />
        )}
      </main>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in border border-indigo-400/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Reader Modals */}
      {activeReaderBook && activeReaderBook.file_type === 'epub' && (
        <EpubReaderModal
          book={activeReaderBook}
          onClose={() => setActiveReaderBook(null)}
          onProgressUpdate={(updated) => {
            setActiveReaderBook(updated);
            handleRefreshBooks();
          }}
        />
      )}

      {activeReaderBook && activeReaderBook.file_type === 'pdf' && (
        <PdfReaderModal
          book={activeReaderBook}
          onClose={() => setActiveReaderBook(null)}
          onProgressUpdate={(updated) => {
            setActiveReaderBook(updated);
            handleRefreshBooks();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedDetailBook && (
        <BookDetailModal
          book={selectedDetailBook}
          onClose={() => setSelectedDetailBook(null)}
          onRead={(book) => {
            setSelectedDetailBook(null);
            handleReadBookWithCheck(book);
          }}
          onEnrich={(book) => {
            setEnrichBook(book);
          }}
          onDelete={handleDeleteBook}
          onAttachFile={handleAttachFileToBook}
        />
      )}

      {/* Metadata Enrich Modal */}
      {enrichBook && (
        <MetadataEnrichModal
          book={enrichBook}
          onClose={() => setEnrichBook(null)}
          onApplyMetadata={handleApplyMetadata}
        />
      )}

      {/* Expo / APK Exporter Modal */}
      {showExporterModal && (
        <ExpoExporterModal onClose={() => setShowExporterModal(false)} />
      )}
    </div>
  );
}
