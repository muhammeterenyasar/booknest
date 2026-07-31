import React, { useState, useEffect } from 'react';
import { GoogleBookVolume, Book } from '../types';
import { searchGoogleBooks } from '../services/googleBooksApi';
import { SearchResultItem } from '../components/SearchResultItem';
import { Search, Globe, Sparkles, Loader2, Check, X, Zap } from 'lucide-react';

interface BookSearchViewProps {
  onAddBookToLibrary: (book: Book) => void;
}

export const BookSearchView: React.FC<BookSearchViewProps> = ({ onAddBookToLibrary }) => {
  const [query, setQuery] = useState<string>('Classic Literature');
  const [results, setResults] = useState<GoogleBookVolume[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const volumes = await searchGoogleBooks(searchTerm);
    setResults(volumes);
    setLoading(false);
  };

  // Dynamic debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  const handleAddVolume = (volume: GoogleBookVolume) => {
    const newBook: Book = {
      id: 'gb_' + volume.id,
      title: volume.title,
      author: volume.authors.join(', '),
      description: volume.description,
      cover_url: volume.thumbnail,
      file_type: 'epub',
      file_size: 1500000,
      has_file: 0,
      current_page: 1,
      total_pages: volume.pageCount || 250,
      progress_percent: 0,
      created_at: Date.now(),
      last_read_at: Date.now(),
    };

    onAddBookToLibrary(newBook);
    setAddedIds((prev) => ({ ...prev, [volume.id]: true }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-[#1E1F28] border border-white/5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[11px] uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5" />
            Live Search & Open Covers
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 justify-center sm:justify-start">
            <Globe className="w-5 h-5 text-indigo-400" />
            Online Book Discovery
          </h2>
          <p className="text-xs text-gray-400">
            Dynamic live search powered by Open Library & Google Books API with high-resolution covers.
          </p>
        </div>
      </div>

      {/* Dynamic Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any title, author, or genre (e.g. Harry Potter, Dune, Jane Austen)..."
            className="w-full pl-12 pr-12 py-3.5 bg-[#1E1F28] border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 shadow-xl transition-all"
          />
          {loading ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Quick Search Tags */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500 font-medium">Quick suggestions:</span>
        {['Sci-Fi Classics', 'Jane Austen', 'Philosophy', 'Dune', 'Modern Fiction', 'Fantasy'].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              performSearch(tag);
            }}
            className="px-3.5 py-1.5 bg-[#1E1F28] hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl border border-white/5 transition-colors cursor-pointer font-medium"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-3 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-[#1E1F28]/30 rounded-2xl border border-white/5">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-semibold text-white">Searching online book metadata & covers...</p>
            <p className="text-xs text-gray-500 mt-1">Filtering results dynamically as you type</p>
          </div>
        ) : results.length > 0 ? (
          results.map((vol) => (
            <div key={vol.id} className="relative">
              <SearchResultItem volume={vol} onAdd={handleAddVolume} />
              {addedIds[vol.id] && (
                <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md z-10">
                  <Check className="w-3.5 h-3.5" />
                  Added to Library
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-gray-500 bg-[#1E1F28]/40 border border-dashed border-gray-800 rounded-2xl">
            <Search className="w-10 h-10 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">Type in the search box above to explore online books instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
};

