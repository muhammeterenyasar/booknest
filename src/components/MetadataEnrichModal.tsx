import React, { useState } from 'react';
import { Book, GoogleBookVolume } from '../types';
import { searchGoogleBooks } from '../services/googleBooksApi';
import { SearchResultItem } from './SearchResultItem';
import { X, Search, Sparkles, Loader2 } from 'lucide-react';

interface MetadataEnrichModalProps {
  book: Book;
  onClose: () => void;
  onApplyMetadata: (bookId: string, metadata: Partial<Book>) => void;
}

export const MetadataEnrichModal: React.FC<MetadataEnrichModalProps> = ({
  book,
  onClose,
  onApplyMetadata,
}) => {
  const [query, setQuery] = useState<string>(book.title);
  const [results, setResults] = useState<GoogleBookVolume[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    const volumes = await searchGoogleBooks(query);
    setResults(volumes);
    setLoading(false);
  };

  const handleApply = (volume: GoogleBookVolume) => {
    const updatedMetadata: Partial<Book> = {
      title: volume.title,
      author: volume.authors.join(', '),
      description: volume.description,
      cover_url: volume.thumbnail,
      total_pages: volume.pageCount || book.total_pages,
    };

    onApplyMetadata(book.id, updatedMetadata);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#1E1F28] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-base">Enrich Book Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-800/80 bg-gray-950/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Google Books by title or author..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm">Fetching online metadata...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((vol) => (
              <SearchResultItem
                key={vol.id}
                volume={vol}
                onAdd={handleApply}
                isEnrichMode={true}
              />
            ))
          ) : searched ? (
            <p className="text-center py-12 text-gray-500 text-sm">
              No metadata matches found for "{query}".
            </p>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              <p>Search Google Books above to automatically pull high-resolution covers, accurate page counts, and full synopses for <span className="text-white font-medium">"{book.title}"</span>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
