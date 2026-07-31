import React, { useEffect, useRef, useState } from 'react';
import ePub, { Book as EpubBook, Rendition } from 'epubjs';
import { Book, BookNote, ReadingTheme } from '../types';
import { dbService } from '../db/storage';
import { SAMPLE_EPUB_CONTENT } from '../data/sampleBooks';
import { NotesDrawer } from './NotesDrawer';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Type,
  List,
  BookOpen,
  Edit2,
  StickyNote
} from 'lucide-react';

interface EpubReaderModalProps {
  book: Book;
  onClose: () => void;
  onProgressUpdate: (updatedBook: Book) => void;
}

export const EpubReaderModal: React.FC<EpubReaderModalProps> = ({
  book,
  onClose,
  onProgressUpdate,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const epubBookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [theme, setTheme] = useState<ReadingTheme>('dark');
  const [fontSize, setFontSize] = useState<number>(100);
  const [toc, setToc] = useState<Array<{ label: string; href: string }>>([]);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(book.current_page || 1);
  const [totalPages, setTotalPages] = useState<number>(book.total_pages || 100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [htmlFallback, setHtmlFallback] = useState<string | null>(null);
  const [isEditingTotalPages, setIsEditingTotalPages] = useState<boolean>(false);

  const [notes, setNotes] = useState<BookNote[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentCfi, setCurrentCfi] = useState<string | undefined>(book.epub_cfi);

  const loadNotes = async () => {
    const data = await dbService.getNotesForBook(book.id);
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, [book.id]);

  const touchStartX = useRef<number | null>(null);

  // Initialize Epub Reader
  useEffect(() => {
    let isMounted = true;

    async function initEpub() {
      setIsLoading(true);

      try {
        const fileRecord = await dbService.getBookFile(book.id);
        let bookData: any = null;

        if (fileRecord && fileRecord.data) {
          bookData = fileRecord.data;
        } else if (book.file_path) {
          bookData = book.file_path;
        }

        if (!bookData) {
          setHtmlFallback(SAMPLE_EPUB_CONTENT);
          setIsLoading(false);
          return;
        }

        if (!viewerRef.current) return;
        viewerRef.current.innerHTML = '';

        const eBook = ePub(bookData as any);
        epubBookRef.current = eBook;

        await eBook.ready;

        const navigation = await eBook.loaded.navigation;
        if (navigation && navigation.toc) {
          setToc(
            navigation.toc.map((item) => ({
              label: item.label.trim(),
              href: item.href,
            }))
          );
        }

        const rendition = eBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
        });
        renditionRef.current = rendition;

        applyThemeStyles(rendition, theme, fontSize);

        if (book.epub_cfi) {
          await rendition.display(book.epub_cfi);
        } else {
          await rendition.display();
        }

        const charsPerLoc = Math.round(800 / (fontSize / 100));
        await eBook.locations.generate(charsPerLoc);

        if (isMounted && eBook.locations.length() > 0) {
          const generatedTotal = eBook.locations.length();
          setTotalPages(generatedTotal);
        }

        rendition.on('relocated', (location: any) => {
          if (!isMounted) return;
          if (location && location.start) {
            const cfi = location.start.cfi;
            let pageNum = 1;
            let totalP = totalPages;

            if (eBook.locations && eBook.locations.length() > 0) {
              totalP = eBook.locations.length();
              const loc = eBook.locations.locationFromCfi(cfi);
              if (typeof loc === 'number' && loc >= 0) {
                pageNum = loc + 1;
              } else if (location.start.percentage) {
                pageNum = Math.max(1, Math.round(location.start.percentage * totalP));
              }
            } else if (location.start.percentage) {
              pageNum = Math.max(1, Math.round(location.start.percentage * (book.total_pages || 100)));
            }

            setCurrentPage(pageNum);
            setTotalPages(totalP);
            setCurrentCfi(cfi);

            const percentage = Math.round((pageNum / Math.max(1, totalP)) * 100);

            dbService.updateReadingProgress(book.id, pageNum, totalP, cfi);
            onProgressUpdate({
              ...book,
              current_page: pageNum,
              total_pages: totalP,
              epub_cfi: cfi,
              progress_percent: Math.min(100, percentage),
            });
          }
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          if (!isMounted) return;
          eBook.getRange(cfiRange).then((range: any) => {
            if (range) {
              const text = range.toString().trim();
              if (text) {
                setSelectedText(text);
                setCurrentCfi(cfiRange);
              }
            }
          }).catch(() => {});
        });

        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to parse EPUB:', err);
        setHtmlFallback(SAMPLE_EPUB_CONTENT);
        setIsLoading(false);
      }
    }

    initEpub();

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (epubBookRef.current) {
        epubBookRef.current.destroy();
      }
    };
  }, [book.id]);

  // Handle ResizeObserver to resize rendition iframe automatically
  useEffect(() => {
    if (!viewerRef.current) return;

    let timer: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (renditionRef.current) {
          renditionRef.current.resize('100%', '100%');
        }
      }, 100);
    });

    observer.observe(viewerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Handle theme & font size changes
  useEffect(() => {
    if (renditionRef.current) {
      applyThemeStyles(renditionRef.current, theme, fontSize);
    }
    if (epubBookRef.current && epubBookRef.current.locations) {
      const charsPerLoc = Math.round(800 / (fontSize / 100));
      epubBookRef.current.locations.generate(charsPerLoc).then(() => {
        if (epubBookRef.current?.locations) {
          const newTotal = epubBookRef.current.locations.length();
          if (newTotal > 0) {
            setTotalPages(newTotal);
          }
        }
      });
    }
  }, [theme, fontSize]);

  const applyThemeStyles = (rendition: Rendition, currentTheme: ReadingTheme, currentFontSize: number) => {
    let bg = '#121318';
    let fg = '#E5E7EB';

    if (currentTheme === 'light') {
      bg = '#FFFFFF';
      fg = '#111827';
    } else if (currentTheme === 'sepia') {
      bg = '#FDF6E3';
      fg = '#433422';
    }

    rendition.themes.register('custom', {
      'html': {
        'height': '100% !important',
        'max-height': '100% !important',
        'overflow': 'hidden !important',
        'margin': '0 !important',
        'padding': '0 !important',
      },
      'body': {
        'height': '100% !important',
        'max-height': '100% !important',
        'overflow': 'hidden !important',
        'background': `${bg} !important`,
        'color': `${fg} !important`,
        'font-family': 'system-ui, -apple-system, sans-serif !important',
        'padding': '10px 14px !important',
        'margin': '0 !important',
        'box-sizing': 'border-box !important',
        'font-size': `${currentFontSize}% !important`,
      },
      'p': {
        'line-height': '1.6 !important',
        'margin-bottom': '0.8em !important',
      },
      'img': {
        'max-width': '100% !important',
        'max-height': '100% !important',
        'object-fit': 'contain !important',
      }
    });

    rendition.themes.select('custom');
  };

  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    } else if (htmlFallback) {
      const nextP = Math.min(totalPages, currentPage + 1);
      setCurrentPage(nextP);
      dbService.updateReadingProgress(book.id, nextP, totalPages);
    }
  };

  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    } else if (htmlFallback) {
      const prevP = Math.max(1, currentPage - 1);
      setCurrentPage(prevP);
      dbService.updateReadingProgress(book.id, prevP, totalPages);
    }
  };

  const navigateToc = (href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setShowToc(false);
    }
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
    touchStartX.current = null;
  };

  const getModalBg = () => {
    if (theme === 'light') return 'bg-white text-gray-900';
    if (theme === 'sepia') return 'bg-[#FDF6E3] text-[#433422]';
    return 'bg-[#121318] text-gray-100';
  };

  return (
    <div className={`fixed inset-0 h-[100dvh] w-full max-h-[100dvh] z-50 flex flex-col ${getModalBg()} transition-colors duration-200 select-none overflow-hidden`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-[130px] sm:max-w-md">
            <h2 className="font-bold text-xs sm:text-sm line-clamp-1">{book.title}</h2>
            <p className="text-[10px] text-indigo-400 font-semibold line-clamp-1">{book.author}</p>
          </div>
        </div>

        {/* Reader Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notes Toggle Button */}
          <button
            onClick={() => {
              const selection = window.getSelection()?.toString().trim();
              if (selection) setSelectedText(selection);
              setIsNotesOpen(!isNotesOpen);
            }}
            className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isNotesOpen
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-black/40 text-gray-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Notes & Highlights"
          >
            <StickyNote className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Notes</span>
            {notes.length > 0 && (
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {notes.length}
              </span>
            )}
          </button>

          {toc.length > 0 && (
            <button
              onClick={() => setShowToc(!showToc)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                showToc ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
              title="Table of Contents"
            >
              <List className="w-4 h-4" />
            </button>
          )}

          {/* Theme Selector */}
          <div className="flex bg-black/40 p-0.5 sm:p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1 sm:p-1.5 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400'}`}
              title="Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1 sm:p-1.5 rounded-lg ${theme === 'sepia' ? 'bg-[#EFE6CF] text-[#433422]' : 'text-gray-400'}`}
              title="Sepia Theme"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-1 sm:p-1.5 rounded-lg ${theme === 'light' ? 'bg-white text-gray-900' : 'text-gray-400'}`}
              title="Light Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Font Size Controls */}
          <div className="flex items-center bg-black/40 px-1.5 py-1 rounded-xl border border-white/10 gap-0.5 text-xs text-gray-300">
            <Type className="w-3.5 h-3.5 text-gray-400 hidden sm:block mr-0.5" />
            <button
              onClick={() => setFontSize(Math.max(70, fontSize - 10))}
              className="hover:text-white px-1 font-bold cursor-pointer"
            >
              A-
            </button>
            <span className="text-[10px] w-7 text-center font-bold text-indigo-400">{fontSize}%</span>
            <button
              onClick={() => setFontSize(Math.min(150, fontSize + 10))}
              className="hover:text-white px-1 font-bold cursor-pointer"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Main Reading Viewport - Zero-Scroll Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-1 sm:p-2"
      >
        {/* Left Tap Zone for Previous Page */}
        <div
          onClick={prevPage}
          className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer hover:bg-white/5 transition-colors"
          title="Tap for Previous Page"
        />

        {/* Right Tap Zone for Next Page */}
        <div
          onClick={nextPage}
          className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer hover:bg-white/5 transition-colors"
          title="Tap for Next Page"
        />

        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-gray-400 z-10">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Preparing Paginated Layout...</p>
          </div>
        )}

        {/* EPUB Container */}
        {!htmlFallback ? (
          <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto overflow-hidden relative" />
        ) : (
          <div className="w-full h-full max-w-3xl mx-auto overflow-y-auto p-4 bg-black/20 rounded-2xl border border-white/10">
            <div
              className="prose prose-invert max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlFallback }}
            />
          </div>
        )}

        {/* Table of Contents Drawer */}
        {showToc && (
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-[#1E1F28] border-l border-white/10 z-30 p-3 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <h3 className="font-semibold text-xs text-white flex items-center gap-2">
                <List className="w-4 h-4 text-indigo-400" />
                Table of Contents
              </h3>
              <button
                onClick={() => setShowToc(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {toc.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigateToc(item.href)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-gray-300 hover:text-indigo-400 hover:bg-gray-800/60 rounded-lg transition-colors line-clamp-2 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-white/10 bg-black/20 text-xs shrink-0">
        <button
          onClick={prevPage}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-white rounded-xl transition-colors cursor-pointer font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-medium text-[11px]">Page</span>
          <span className="text-white font-bold">{currentPage}</span>
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
              className="w-13 text-center bg-gray-900 border border-indigo-500 rounded-lg px-1 py-1 text-indigo-400 font-bold text-xs focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingTotalPages(true)}
              className="px-2 py-1 bg-black/40 hover:bg-black/60 border border-white/10 rounded-lg text-white font-bold flex items-center gap-1 group transition-all cursor-pointer"
              title="Click to manually edit total pages"
            >
              <span>{totalPages}</span>
              <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-indigo-400" />
            </button>
          )}
        </div>

        <button
          onClick={nextPage}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-md cursor-pointer font-bold"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Notes & Highlights Drawer */}
      <NotesDrawer
        bookId={book.id}
        bookTitle={book.title}
        currentPage={currentPage}
        currentCfi={currentCfi}
        notes={notes}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onJumpToPage={(p, cfi) => {
          if (cfi && renditionRef.current) {
            renditionRef.current.display(cfi);
          } else if (p > currentPage) {
            for (let i = 0; i < p - currentPage; i++) nextPage();
          } else if (p < currentPage) {
            for (let i = 0; i < currentPage - p; i++) prevPage();
          }
        }}
        onRefreshNotes={loadNotes}
        initialSelectedText={selectedText}
      />
    </div>
  );
};
