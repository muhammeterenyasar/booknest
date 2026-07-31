import React, { useState } from 'react';
import { Book, FileType, SortOption } from '../types';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import {
  Search,
  BookOpen,
  FileText,
  Clock,
  ArrowUpDown,
  X,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onReadBook: (book: Book) => void;
  onEnrichBook: (book: Book) => void;
  onImportClick: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onReadBook,
  onEnrichBook,
  onImportClick,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<'all' | FileType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('last_read');

  // Find most recently read book for the hero banner
  const mostRecentBook = [...books]
    .filter((b) => (b.last_read_at || 0) > 0)
    .sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0))[0] || books[0];

  // Filter books locally & instantly
  const filteredBooks = books.filter((book) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q);
    const matchesFormat = formatFilter === 'all' || book.file_type === formatFilter;
    return matchesSearch && matchesFormat;
  });

  // Sort books
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'last_read') return (b.last_read_at || 0) - (a.last_read_at || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'author') return a.author.localeCompare(b.author);
    if (sortBy === 'progress') return b.progress_percent - a.progress_percent;
    return 0;
  });

  // Calculate statistics
  const totalBooks = books.length;
  const epubCount = books.filter((b) => b.file_type === 'epub').length;
  const pdfCount = books.filter((b) => b.file_type === 'pdf').length;
  const readingCount = books.filter((b) => b.progress_percent > 0 && b.progress_percent < 100).length;

  return (
    <div className="space-y-6">
      {/* Featured Continue Reading Banner (Immersive UI Style) */}
      {mostRecentBook && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1A1B24] via-[#1E1F28] to-[#252634] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-28 sm:w-24 sm:h-36 flex-shrink-0 bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-white/10 relative group cursor-pointer" onClick={() => onSelectBook(mostRecentBook)}>
                {mostRecentBook.cover_url ? (
                  <img
                    src={mostRecentBook.cover_url}
                    alt={mostRecentBook.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>

              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Continue Reading
                </div>
                <h2
                  onClick={() => onSelectBook(mostRecentBook)}
                  className="text-xl sm:text-2xl font-black text-white hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1 tracking-tight"
                >
                  {mostRecentBook.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 font-medium">
                  {mostRecentBook.author}
                </p>

                <div className="pt-2 w-full max-w-sm space-y-1">
                  <ProgressBar progress={mostRecentBook.progress_percent} showLabel size="sm" />
                  <p className="text-[11px] text-gray-500">
                    Page {mostRecentBook.current_page} of {mostRecentBook.total_pages || 1}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => onReadBook(mostRecentBook)}
                className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Resume Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#1E1F28] border border-white/5 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{totalBooks}</p>
            <p className="text-xs text-gray-400">Total Library</p>
          </div>
        </div>

        <div className="p-4 bg-[#1E1F28] border border-white/5 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{readingCount}</p>
            <p className="text-xs text-gray-400">In Progress</p>
          </div>
        </div>

        <div className="p-4 bg-[#1E1F28] border border-white/5 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{epubCount}</p>
            <p className="text-xs text-gray-400">EPUB Books</p>
          </div>
        </div>

        <div className="p-4 bg-[#1E1F28] border border-white/5 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{pdfCount}</p>
            <p className="text-xs text-gray-400">PDF Documents</p>
          </div>
        </div>
      </div>

      {/* Instant Offline Search & Toolbar Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#1E1F28] p-3 rounded-2xl border border-white/5">
        {/* Instant Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offline library by title or author..."
            className="w-full pl-10 pr-9 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
              Instant
            </span>
          )}
        </div>

        {/* Filter Pills & Sorting */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Format Filter */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                formatFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({books.length})
            </button>
            <button
              onClick={() => setFormatFilter('epub')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                formatFilter === 'epub' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              EPUB ({epubCount})
            </button>
            <button
              onClick={() => setFormatFilter('pdf')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                formatFilter === 'pdf' ? 'bg-rose-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              PDF ({pdfCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-gray-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="last_read" className="bg-[#1E1F28] text-white">Recently Read</option>
              <option value="title" className="bg-[#1E1F28] text-white">Title (A-Z)</option>
              <option value="author" className="bg-[#1E1F28] text-white">Author (A-Z)</option>
              <option value="progress" className="bg-[#1E1F28] text-white">Progress (%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Grid */}
      {sortedBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onRead={onReadBook}
              onEnrich={onEnrichBook}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={searchQuery ? 'No matching books found in offline storage' : 'Your Library is Empty'}
          description={
            searchQuery
              ? `No books match "${searchQuery}" in your local database. Search title or author, or import new files.`
              : 'Import EPUB or PDF books from your device or search Google Books online.'
          }
          onAction={onImportClick}
          actionText="Import EPUB/PDF Files"
          icon={searchQuery ? 'search' : 'library'}
        />
      )}
    </div>
  );
};
