import React from 'react';
import { Library, Upload, Search } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionText?: string;
  icon?: 'library' | 'search';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Your Library is Empty',
  description = 'Import EPUB or PDF books to build your personal offline reading collection.',
  onAction,
  actionText = 'Import Books',
  icon = 'library',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1E1F28]/50 border border-dashed border-gray-800 rounded-2xl max-w-md mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
        {icon === 'search' ? (
          <Search className="w-8 h-8" />
        ) : (
          <Library className="w-8 h-8" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">{description}</p>

      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <Upload className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};
