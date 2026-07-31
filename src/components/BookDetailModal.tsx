import React, { useEffect, useRef, useState } from 'react';
import { Book } from '../types';
import { ProgressBar } from './ProgressBar';
import { formatFileSize } from '../services/fileService';
import { dbService } from '../db/storage';
import {
  X,
  BookOpen,
  Sparkles,
  Trash2,
  Calendar,
  FileCheck,
  HardDrive,
  Paperclip,
  CheckCircle2,
  Upload,
  Edit3,
  StickyNote
} from 'lucide-react';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
  onRead: (book: Book) => void;
  onEnrich: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onAttachFile?: (bookId: string, file: File) => Promise<Book | void>;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book: initialBook,
  onClose,
  onRead,
  onEnrich,
  onDelete,
  onAttachFile,
}) => {
  const [currentBook, setCurrentBook] = useState<Book>(initialBook);
  const [isAttaching, setIsAttaching] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingPages, setIsEditingPages] = useState<boolean>(false);
  const [editedPages, setEditedPages] = useState<number>(initialBook.total_pages || 1);
  const [notesCount, setNotesCount] = useState<number>(0);

  useEffect(() => {
    dbService.getNotesForBook(initialBook.id).then((n) => setNotesCount(n.length));
  }, [initialBook.id]);

  const handleSavePageCount = async () => {
    if (isNaN(editedPages) || editedPages < 1) return;
    const progress = Math.min(100, (currentBook.current_page / editedPages) * 100);
    const updated: Book = {
      ...currentBook,
      total_pages: editedPages,
      progress_percent: parseFloat(progress.toFixed(1)),
    };
    setCurrentBook(updated);
    setIsEditingPages(false);
    await dbService.updateReadingProgress(currentBook.id, currentBook.current_page, editedPages);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachFile) return;

    setIsAttaching(true);
    try {
      const updated = await onAttachFile(currentBook.id, file);
      if (updated) {
        setCurrentBook(updated);
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase() === 'pdf' ? 'pdf' : 'epub';
        setCurrentBook((prev) => ({
          ...prev,
          has_file: 1,
          file_type: ext,
          file_size: file.size,
        }));
      }
    } catch (err) {
      console.error('File attachment error:', err);
    } finally {
      setIsAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasFileLinked = currentBook.has_file === 1 || !!currentBook.file_path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-2xl bg-[#1E1F28] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Book Details & File Pairing
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Book Cover */}
            <div className="w-32 h-48 sm:w-36 sm:h-52 flex-shrink-0 bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-white/10 relative mx-auto sm:mx-0">
              {currentBook.cover_url ? (
                <img
                  src={currentBook.cover_url}
                  alt={currentBook.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-2 text-center">
                  <BookOpen className="w-10 h-10 mb-2 stroke-[1.5]" />
                  <span className="text-[10px] text-gray-500 line-clamp-2">{currentBook.title}</span>
                </div>
              )}
              <span
                className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded uppercase shadow ${
                  currentBook.file_type === 'pdf' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                }`}
              >
                {currentBook.file_type}
              </span>
            </div>

            {/* Book Metadata */}
            <div className="flex-1 space-y-3 text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-snug">{currentBook.title}</h2>
                <p className="text-xs sm:text-sm font-medium text-indigo-400 mt-0.5">{currentBook.author}</p>
              </div>

              {/* Badges & File Specs */}
              <div className="flex flex-wrap gap-2 pt-0.5 text-xs text-gray-400">
                <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatFileSize(currentBook.file_size)}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                  {isEditingPages ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editedPages}
                        onChange={(e) => setEditedPages(parseInt(e.target.value) || 1)}
                        className="w-16 px-1.5 py-0.5 bg-gray-900 border border-indigo-500 text-indigo-300 font-bold text-xs rounded"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePageCount}
                        className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[10px] rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditedPages(currentBook.total_pages || 1);
                        setIsEditingPages(true);
                      }}
                      className="hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      title="Click to edit total pages"
                    >
                      <span>{currentBook.total_pages || 1} pages</span>
                      <Edit3 className="w-3 h-3 text-gray-500 hover:text-indigo-400" />
                    </button>
                  )}
                </div>
                {currentBook.last_read_at && (
                  <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Read {new Date(currentBook.last_read_at).toLocaleDateString()}</span>
                  </div>
                )}
                {notesCount > 0 && (
                  <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-semibold">
                    <StickyNote className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{notesCount} {notesCount === 1 ? 'Note' : 'Notes'}</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="p-3 bg-black/30 rounded-2xl border border-white/5">
                <ProgressBar progress={currentBook.progress_percent} showLabel size="md" />
                <p className="text-xs text-gray-400 mt-2">
                  Currently at page {currentBook.current_page} of {currentBook.total_pages || 1}
                </p>
              </div>

              {/* File Matching Banner Section */}
              <div className="p-3 rounded-2xl border bg-black/40 flex flex-col gap-2 border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasFileLinked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white">
                      {hasFileLinked ? 'EPUB / PDF File Matched' : 'No Reading File Attached'}
                    </span>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAttaching}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {hasFileLinked ? 'Re-match / Replace File' : 'Match EPUB or PDF'}
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 leading-snug">
                  {hasFileLinked
                    ? 'A local document file is linked to this book entry. Click "Re-match" to swap with another file.'
                    : 'Attach an EPUB or PDF file from your device to pair it with this entry and enable reading.'}
                </p>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Synopsis
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {currentBook.description || 'No description added. Click "Enrich Metadata" to fetch online synopsis.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3.5 border-t border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => onDelete(currentBook.id)}
            className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Book
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEnrich(currentBook)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Enrich Metadata</span>
              <span className="sm:hidden">Enrich</span>
            </button>

            <button
              onClick={() => {
                if (!hasFileLinked) {
                  fileInputRef.current?.click();
                } else {
                  onRead(currentBook);
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              {hasFileLinked ? 'Read Now' : 'Attach File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
