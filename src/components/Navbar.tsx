import React from 'react';
import {
  Library,
  Search,
  Upload,
  Smartphone,
  BookOpen,
  History,
} from 'lucide-react';

interface NavbarProps {
  activeView: 'library' | 'history' | 'search';
  onSelectView: (view: 'library' | 'history' | 'search') => void;
  onImportClick: () => void;
  onOpenExporter: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onSelectView,
  onImportClick,
  onOpenExporter,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121318]/90 backdrop-blur-md border-b border-white/5 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectView('library')}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base sm:text-lg tracking-tight flex items-center gap-1.5">
              BookNest
              <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider">
                E-Reader
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 hidden md:block">
              Offline-First EPUB & PDF Library
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#1E1F28] p-1 rounded-xl border border-white/5 text-xs overflow-x-auto">
          <button
            onClick={() => onSelectView('library')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'library'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Library</span>
            <span className="sm:hidden">Library</span>
          </button>
          <button
            onClick={() => onSelectView('history')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          <button
            onClick={() => onSelectView('search')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'search'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Books</span>
            <span className="sm:hidden">Search</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExporter}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-gray-800/90 hover:bg-gray-700 text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-500/30 transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Export React Native Expo Codebase & Build Android APK"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Export Expo / APK</span>
          </button>

          <button
            onClick={onImportClick}
            className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import File</span>
            <span className="sm:hidden">Import</span>
          </button>
        </div>
      </div>
    </header>
  );
};
