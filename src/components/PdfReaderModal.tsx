import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookNote } from '../types';
import { dbService } from '../db/storage';
import { NotesDrawer } from './NotesDrawer';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Type,
  Edit2,
  Loader2,
  FileText,
  StickyNote
} from 'lucide-react';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfReaderModalProps {
  book: Book;
  onClose: () => void;
  onProgressUpdate: (updatedBook: Book) => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  book,
  onClose,
  onProgressUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(book.current_page || 1);
  const [totalPages, setTotalPages] = useState<number>(book.total_pages || 300);
  const [zoom, setZoom] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [isEditingTotalPages, setIsEditingTotalPages] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [notes, setNotes] = useState<BookNote[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>('');

  const loadNotes = async () => {
    const data = await dbService.getNotesForBook(book.id);
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, [book.id]);

  // Load PDF Document & Exact Page Count
  useEffect(() => {
    let active = true;

    async function loadPdf() {
      setIsLoading(true);
      setRenderError(null);

      try {
        const fileRecord = await dbService.getBookFile(book.id);
        let arrayBuffer: ArrayBuffer | null = null;

        if (fileRecord && fileRecord.data) {
          arrayBuffer = await fileRecord.data.arrayBuffer();
        } else if (book.file_path) {
          const res = await fetch(book.file_path);
          arrayBuffer = await res.arrayBuffer();
        }

        if (!arrayBuffer) {
          throw new Error('No PDF file found for this book.');
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        if (!active) return;

        setPdfDoc(doc);
        const exactPages = doc.numPages;
        setTotalPages(exactPages);

        if (exactPages !== book.total_pages) {
          dbService.updateReadingProgress(book.id, book.current_page || 1, exactPages);
          onProgressUpdate({
            ...book,
            total_pages: exactPages,
            progress_percent: parseFloat((((book.current_page || 1) / exactPages) * 100).toFixed(1)),
          });
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('PDF load error:', err);
        setRenderError(err.message || 'Failed to load PDF document');
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      active = false;
    };
  }, [book.id]);

  // Render Page to Canvas - HD Device Pixel Ratio & Strict Viewport Fitting
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    let renderTask: any = null;
    let isCancelled = false;

    async function renderPage() {
      setIsRenderingPage(true);
      try {
        const validPageNum = Math.max(1, Math.min(pdfDoc.numPages, currentPage));
        const page = await pdfDoc.getPage(validPageNum);

        if (isCancelled) return;

        const container = containerRef.current;
        if (!container) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Container bounds minus small margin
        const cWidth = Math.max(120, container.clientWidth - 12);
        const cHeight = Math.max(120, container.clientHeight - 12);

        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate scale to fit strictly inside container height and width
        const scaleX = cWidth / unscaledViewport.width;
        const scaleY = cHeight / unscaledViewport.height;

        const zoomFactor = zoom / 100;
        const fitScale = Math.min(scaleX, scaleY) * zoomFactor;

        const viewport = page.getViewport({ scale: fitScale });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.save();
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        ctx.restore();
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Canvas render error:', err);
        }
      } finally {
        setIsRenderingPage(false);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // Handle ResizeObserver to re-fit canvas dynamically on device orientation or mobile UI change
  useEffect(() => {
    if (!containerRef.current) return;

    let timer: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (pdfDoc) {
          setCurrentPage((p) => p);
        }
      }, 100);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pdfDoc]);

  // Page navigation
  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(validPage);

    dbService.updateReadingProgress(book.id, validPage, totalPages);
    onProgressUpdate({
      ...book,
      current_page: validPage,
      total_pages: totalPages,
      progress_percent: parseFloat(((validPage / totalPages) * 100).toFixed(1)),
    });
  };

  const handleTotalPagesChange = (newTotal: number) => {
    if (isNaN(newTotal) || newTotal < 1) return;
    setTotalPages(newTotal);
    dbService.updateReadingProgress(book.id, currentPage, newTotal);
    onProgressUpdate({
      ...book,
      total_pages: newTotal,
      progress_percent: parseFloat(((currentPage / newTotal) * 100).toFixed(1)),
    });
  };

  // Touch Swipe Handling
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        handlePageChange(currentPage + 1);
      } else {
        handlePageChange(currentPage - 1);
      }
    }
    touchStartX.current = null;
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-h-[100dvh] z-50 flex flex-col bg-[#121318] text-white select-none overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Close Reader"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-[150px] sm:max-w-md">
            <h2 className="font-bold text-xs sm:text-sm line-clamp-1 text-white">{book.title}</h2>
            <p className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
              PDF Reader
            </p>
          </div>
        </div>

        {/* Text/Size Controls & Notes Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const selection = window.getSelection()?.toString().trim();
              if (selection) setSelectedText(selection);
              setIsNotesOpen(!isNotesOpen);
            }}
            className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isNotesOpen
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-gray-900 text-gray-300 border-white/10 hover:text-white hover:bg-gray-800'
            }`}
            title="Notes & Highlights"
          >
            <StickyNote className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Notes</span>
            {notes.length > 0 && (
              <span className="bg-rose-500/30 text-rose-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {notes.length}
              </span>
            )}
          </button>

          <div className="flex items-center bg-gray-900 border border-white/10 rounded-xl px-2 py-1 gap-1 text-xs text-gray-300">
            <Type className="w-3.5 h-3.5 text-gray-400 mr-0.5 hidden sm:block" />
            <button
              onClick={() => setZoom(Math.max(60, zoom - 15))}
              className="px-1.5 py-0.5 hover:text-white font-bold text-xs cursor-pointer"
              title="Smaller size"
            >
              A-
            </button>
            <span className="w-8 text-center text-[10px] font-bold text-rose-400">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(180, zoom + 15))}
              className="px-1.5 py-0.5 hover:text-white font-bold text-xs cursor-pointer"
              title="Larger size"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Stage - Zero Scrolling */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 bg-black relative overflow-hidden flex items-center justify-center p-1.5"
      >
        {/* Left Tap Zone for Previous Page */}
        <div
          onClick={() => handlePageChange(currentPage - 1)}
          className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer hover:bg-white/5 transition-colors"
          title="Tap for Previous Page"
        />

        {/* Right Tap Zone for Next Page */}
        <div
          onClick={() => handlePageChange(currentPage + 1)}
          className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer hover:bg-white/5 transition-colors"
          title="Tap for Next Page"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-gray-400 z-10">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-sm font-semibold">Loading PDF Document...</p>
          </div>
        ) : renderError ? (
          <div className="flex flex-col items-center text-center p-5 max-w-xs z-10 bg-gray-900/80 rounded-2xl border border-rose-500/30">
            <FileText className="w-8 h-8 text-rose-400 mb-2" />
            <p className="text-xs font-bold text-rose-200">{renderError}</p>
          </div>
        ) : (
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <canvas
              ref={canvasRef}
              className="rounded shadow-2xl bg-white max-w-full max-h-full object-contain"
            />
            {isRenderingPage && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center rounded">
                <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reader Footer Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-white/10 bg-black/40 text-xs shrink-0">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white rounded-xl transition-colors cursor-pointer font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-medium text-[11px]">Page</span>
          <input
            type="number"
            value={currentPage}
            onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
            className="w-11 text-center bg-gray-900 border border-white/10 rounded-lg px-1 py-1 text-white font-bold text-xs focus:outline-none focus:border-rose-500"
          />
          <span className="text-gray-400 font-medium text-[11px]">of</span>
          {isEditingTotalPages ? (
            <input
              type="number"
              defaultValue={totalPages}
              onBlur={(e) => {
                handleTotalPagesChange(parseInt(e.target.value) || totalPages);
                setIsEditingTotalPages(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTotalPagesChange(parseInt((e.target as HTMLInputElement).value) || totalPages);
                  setIsEditingTotalPages(false);
                }
              }}
              autoFocus
              className="w-13 text-center bg-gray-900 border border-rose-500 rounded-lg px-1 py-1 text-rose-400 font-bold text-xs focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingTotalPages(true)}
              className="px-2 py-1 bg-gray-900 hover:bg-gray-800 border border-white/10 rounded-lg text-white font-bold flex items-center gap-1 group transition-all cursor-pointer"
              title="Click to manually edit total pages"
            >
              <span>{totalPages}</span>
              <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-rose-400" />
            </button>
          )}
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white rounded-xl transition-colors shadow-md cursor-pointer font-bold"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Notes & Highlights Side Drawer */}
      <NotesDrawer
        bookId={book.id}
        bookTitle={book.title}
        currentPage={currentPage}
        notes={notes}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onJumpToPage={(p) => {
          handlePageChange(p);
        }}
        onRefreshNotes={loadNotes}
        initialSelectedText={selectedText}
      />
    </div>
  );
};
