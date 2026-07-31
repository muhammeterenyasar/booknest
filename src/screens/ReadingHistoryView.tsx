import React from 'react';
import { Book } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import {
  History,
  BookOpen,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ReadingHistoryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onReadBook: (book: Book) => void;
}

export const ReadingHistoryView: React.FC<ReadingHistoryViewProps> = ({
  books,
  onSelectBook,
  onReadBook,
}) => {
  // Sort books by last_read_at DESC (only show books that have a last_read_at timestamp)
  const historyBooks = [...books]
    .filter((b) => b.last_read_at)
    .sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Never read';
    const now = Date.now();
    const diffHours = Math.floor((now - ts) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Immersive Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1E1F28] via-[#1A1B24] to-[#252634] p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl">
        <div className="absolute right-[-20px] top-[-30px] w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest">
              <History className="w-3.5 h-3.5" />
              Reading Activity Log
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Reading History
            </h2>
            <p className="text-sm text-gray-400 max-w-lg">
              Track your reading milestones, recently opened books, and progress timeline sorted by latest activity.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-gray-400">Total Read Sessions</p>
              <p className="text-lg font-bold text-white">{historyBooks.length} Books</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Timeline List */}
      {historyBooks.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 px-2 pb-1">
            <span>Chronological Activity</span>
            <span>{historyBooks.length} items logged</span>
          </div>

          <div className="space-y-3">
            {historyBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group relative bg-[#1E1F28] hover:bg-[#252634] border border-white/5 hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Book info & cover */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-20 sm:w-16 sm:h-22 flex-shrink-0 bg-gray-900 rounded-xl overflow-hidden relative shadow-md border border-white/5">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                    <span
                      className={`absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        book.file_type === 'pdf' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {book.file_type}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{book.author}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1 text-indigo-300 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        {formatTimestamp(book.last_read_at)}
                      </span>
                      <span>Page {book.current_page} of {book.total_pages || 1}</span>
                    </div>
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="w-full sm:w-64 flex flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800/80">
                  <div className="w-full">
                    <ProgressBar progress={book.progress_percent} showLabel size="sm" />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBook(book);
                      }}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReadBook(book);
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Read
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#1E1F28]/40 border border-dashed border-gray-800 rounded-3xl p-8">
          <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Reading Activity Yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Books you open and read in BookNest will automatically appear here with exact reading progress and timestamps.
          </p>
        </div>
      )}
    </div>
  );
};
