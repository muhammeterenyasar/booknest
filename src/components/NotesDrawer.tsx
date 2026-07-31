import React, { useState } from 'react';
import { BookNote, HighlightColor } from '../types';
import { dbService } from '../db/storage';
import {
  X,
  StickyNote,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  Download,
  Highlighter,
  Check,
  FileText
} from 'lucide-react';

interface NotesDrawerProps {
  bookId: string;
  bookTitle: string;
  currentPage: number;
  currentCfi?: string;
  notes: BookNote[];
  isOpen: boolean;
  onClose: () => void;
  onJumpToPage: (page: number, cfi?: string) => void;
  onRefreshNotes: () => void;
  initialSelectedText?: string;
}

const COLOR_CONFIG: Record<
  HighlightColor,
  { name: string; bgClass: string; borderClass: string; badgeClass: string }
> = {
  yellow: {
    name: 'Yellow',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  green: {
    name: 'Green',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    borderClass: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  blue: {
    name: 'Blue',
    bgClass: 'bg-sky-500/10 hover:bg-sky-500/20',
    borderClass: 'border-sky-500/40',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  pink: {
    name: 'Pink',
    bgClass: 'bg-rose-500/10 hover:bg-rose-500/20',
    borderClass: 'border-rose-500/40',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  purple: {
    name: 'Purple',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderClass: 'border-purple-500/40',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  bookId,
  bookTitle,
  currentPage,
  currentCfi,
  notes,
  isOpen,
  onClose,
  onJumpToPage,
  onRefreshNotes,
  initialSelectedText = '',
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'current'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(!!initialSelectedText);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form fields
  const [noteContent, setNoteContent] = useState<string>('');
  const [highlightText, setHighlightText] = useState<string>(initialSelectedText);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [targetPage, setTargetPage] = useState<number>(currentPage);

  if (!isOpen) return null;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (filterMode === 'current' && n.page !== currentPage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNote = n.note_text.toLowerCase().includes(q);
      const matchHighlight = n.highlight_text?.toLowerCase().includes(q);
      return matchNote || matchHighlight;
    }
    return true;
  });

  const handleOpenCreateForm = () => {
    setEditingNoteId(null);
    setNoteContent('');
    setHighlightText(initialSelectedText || '');
    setSelectedColor('yellow');
    setTargetPage(currentPage);
    setIsCreating(true);
  };

  const handleStartEdit = (note: BookNote) => {
    setIsCreating(false);
    setEditingNoteId(note.id);
    setNoteContent(note.note_text);
    setHighlightText(note.highlight_text || '');
    setSelectedColor(note.color || 'yellow');
    setTargetPage(note.page);
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() && !highlightText.trim()) return;

    const now = Date.now();
    const noteObj: BookNote = {
      id: editingNoteId || `note_${now}_${Math.random().toString(36).substring(2, 7)}`,
      book_id: bookId,
      page: targetPage,
      cfi: currentCfi,
      highlight_text: highlightText.trim() || undefined,
      note_text: noteContent.trim(),
      color: selectedColor,
      created_at: editingNoteId ? (notes.find((n) => n.id === editingNoteId)?.created_at || now) : now,
      updated_at: now,
    };

    await dbService.saveNote(noteObj);
    setIsCreating(false);
    setEditingNoteId(null);
    setNoteContent('');
    setHighlightText('');
    onRefreshNotes();
  };

  const handleDeleteNote = async (id: string) => {
    await dbService.deleteNote(id);
    onRefreshNotes();
  };

  const handleExportNotes = () => {
    if (notes.length === 0) return;

    let content = `# Reading Notes & Highlights\n`;
    content += `Book: ${bookTitle}\n`;
    content += `Exported: ${new Date().toLocaleString()}\n`;
    content += `Total Notes: ${notes.length}\n\n`;
    content += `---\n\n`;

    notes.forEach((n, idx) => {
      content += `### Note ${idx + 1} (Page ${n.page})\n`;
      if (n.highlight_text) {
        content += `> "${n.highlight_text}"\n\n`;
      }
      if (n.note_text) {
        content += `${n.note_text}\n\n`;
      }
      content += `*Added on: ${new Date(n.created_at).toLocaleDateString()}*\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#181920] border-l border-white/10 shadow-2xl flex flex-col text-white animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <StickyNote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              Notes & Highlights
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                {notes.length}
              </span>
            </h2>
            <p className="text-[11px] text-gray-400 line-clamp-1">{bookTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {notes.length > 0 && (
            <button
              onClick={handleExportNotes}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Export Notes as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="p-3 border-b border-white/5 bg-black/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex bg-gray-900 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({notes.length})
          </button>
          <button
            onClick={() => setFilterMode('current')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filterMode === 'current' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Page {currentPage} ({notes.filter((n) => n.page === currentPage).length})
          </button>
        </div>

        {!isCreating && !editingNoteId && (
          <button
            onClick={handleOpenCreateForm}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note</span>
          </button>
        )}
      </div>

      {/* Note Creation / Edit Overlay Box */}
      {(isCreating || editingNoteId) && (
        <div className="p-4 bg-gray-900/90 border-b border-indigo-500/30 space-y-3 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Highlighter className="w-4 h-4" />
              {editingNoteId ? 'Edit Note' : `New Note for Page ${targetPage}`}
            </span>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingNoteId(null);
              }}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Highlight Color Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">Highlight Color</label>
            <div className="flex items-center gap-2">
              {(['yellow', 'green', 'blue', 'pink', 'purple'] as HighlightColor[]).map((c) => {
                const conf = COLOR_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      selectedColor === c ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                    } ${conf.badgeClass}`}
                    title={conf.name}
                  >
                    {selectedColor === c && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Excerpt / Highlighted Snippet */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Highlighted Quote / Excerpt (Optional)
            </label>
            <input
              type="text"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="e.g. 'To be or not to be...'"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Note Content */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">Personal Reflection / Note</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note or thoughts here..."
              rows={3}
              autoFocus
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <button
            onClick={handleSaveNote}
            disabled={!noteContent.trim() && !highlightText.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {editingNoteId ? 'Update Note' : 'Save Note to Book'}
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-white/5 bg-black/10 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or quotes..."
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-gray-500 space-y-2">
            <FileText className="w-10 h-10 stroke-[1.2] text-gray-600" />
            <p className="text-xs font-semibold">No notes found for this selection.</p>
            <p className="text-[11px] text-gray-600">
              Click "Add Note" above to anchor thoughts or quotes to page {currentPage}.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const colorConf = COLOR_CONFIG[note.color || 'yellow'];
            return (
              <div
                key={note.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2 relative group ${colorConf.bgClass} ${colorConf.borderClass}`}
              >
                {/* Note Header Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onJumpToPage(note.page, note.cfi)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 hover:brightness-125 transition-all cursor-pointer ${colorConf.badgeClass}`}
                      title="Jump directly to this page in book"
                    >
                      <span>Page {note.page}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-gray-400">
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(note)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-black/30 rounded-lg transition-colors cursor-pointer"
                      title="Edit note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-gray-400 hover:text-rose-400 hover:bg-black/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Highlight Quote */}
                {note.highlight_text && (
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs text-gray-200 italic font-serif leading-relaxed">
                    "{note.highlight_text}"
                  </div>
                )}

                {/* Personal Note */}
                {note.note_text && (
                  <p className="text-xs text-gray-100 font-medium leading-relaxed whitespace-pre-wrap">
                    {note.note_text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
