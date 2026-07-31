import React from 'react';
import { Book } from '../types';
import { ProgressBar } from './ProgressBar';
import { BookOpen, FileText, MoreVertical, Sparkles } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onRead: (book: Book) => void;
  onEnrich?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onRead, onEnrich }) => {
  const isPdf = book.file_type === 'pdf';

  return (
    <div
      onClick={() => onSelect(book)}
      className="group relative bg-[#1E1F28] rounded-xl border border-gray-800/80 hover:border-indigo-500/50 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full"
    >
      {/* Cover image container */}
      <div className="relative aspect-[3/4] w-full bg-gray-900 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
            <BookOpen className="w-12 h-12 mb-2 stroke-[1.5]" />
            <span className="text-xs text-center line-clamp-2 px-2 text-gray-400">{book.title}</span>
          </div>
        )}

        {/* Format Badge & File Status */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span
            className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded uppercase shadow-md ${
              isPdf
                ? 'bg-rose-500/90 text-white'
                : 'bg-indigo-600/90 text-white'
            }`}
          >
            {book.file_type}
          </span>
          {book.has_file === 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-500 text-gray-950 rounded uppercase shadow-md animate-pulse">
              Needs File
            </span>
          )}
        </div>

        {/* Read Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(book);
            }}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read Now
          </button>
          {onEnrich && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnrich(book);
              }}
              title="Enrich Metadata"
              className="p-2 bg-gray-800/90 hover:bg-gray-700 text-indigo-400 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-indigo-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{book.author}</p>
        </div>

        {/* Progress bar */}
        <div className="mt-3 pt-2 border-t border-gray-800/60">
          <ProgressBar progress={book.progress_percent} size="sm" />
          <div className="flex justify-between items-center mt-1 text-[11px] text-gray-500">
            <span>
              {book.current_page} / {book.total_pages || 1} p.
            </span>
            <span>{book.progress_percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
