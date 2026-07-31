import React from 'react';
import { GoogleBookVolume } from '../types';
import { Plus, BookOpen, ExternalLink, Calendar } from 'lucide-react';

interface SearchResultItemProps {
  volume: GoogleBookVolume;
  onAdd: (volume: GoogleBookVolume) => void;
  isEnrichMode?: boolean;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  volume,
  onAdd,
  isEnrichMode = false,
}) => {
  return (
    <div className="flex gap-4 p-4 bg-[#1E1F28] border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
      {/* Cover Image */}
      <div className="w-20 h-28 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden relative">
        {volume.thumbnail ? (
          <img
            src={volume.thumbnail}
            alt={volume.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <BookOpen className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="font-semibold text-white text-base line-clamp-1">{volume.title}</h4>
          <p className="text-xs text-indigo-400 font-medium mt-0.5">
            {volume.authors.join(', ')}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
            {volume.publishedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {volume.publishedDate}
              </span>
            )}
            {volume.pageCount ? <span>{volume.pageCount} pages</span> : null}
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 mt-2 leading-relaxed">
            {volume.description}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/80">
          {volume.infoLink ? (
            <a
              href={volume.infoLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              Google Books
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : <div />}

          <button
            onClick={() => onAdd(volume)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            {isEnrichMode ? 'Apply Metadata' : 'Add to Library'}
          </button>
        </div>
      </div>
    </div>
  );
};
