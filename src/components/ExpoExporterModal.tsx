import React, { useState } from 'react';
import { EXPO_FILES } from '../data/expoCodebase';
import {
  X,
  Code,
  Copy,
  Check,
  Smartphone,
  Terminal,
  Download,
  FileCode,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ExpoExporterModalProps {
  onClose: () => void;
}

export const ExpoExporterModal: React.FC<ExpoExporterModalProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'files' | 'instructions'>('files');

  const file = EXPO_FILES[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(file.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = () => {
    // Generate a simple text script or file manifest for downloading
    const content = EXPO_FILES.map(f => `--- ${f.path} ---\n\n${f.code}\n\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BookNest_Expo_Project_Files.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-[#121318] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#1E1F28]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                BookNest React Native / Expo Codebase
              </h2>
              <p className="text-xs text-gray-400">
                Full Expo SDK 51+ mobile codebase ready to build into an Android .APK file
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher tabs */}
            <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
              <button
                onClick={() => setActiveTab('files')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Code Explorer ({EXPO_FILES.length})
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'instructions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                APK Build Guide
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'files' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar list of files */}
            <div className="w-72 bg-[#1E1F28]/60 border-r border-gray-800 overflow-y-auto p-3 space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 flex justify-between items-center">
                <span>Project Source Tree</span>
                <span className="text-indigo-400">{EXPO_FILES.length} Files</span>
              </div>
              {EXPO_FILES.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedFile(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedFile === i
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className={`w-4 h-4 flex-shrink-0 ${selectedFile === i ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <span className="truncate">{f.filename}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
            </div>

            {/* Code Viewer Panel */}
            <div className="flex-1 flex flex-col bg-[#0D0E12] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#121318] border-b border-gray-800 text-xs">
                <div>
                  <span className="text-gray-500">Path: </span>
                  <span className="font-mono text-indigo-400 font-medium">{file.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-gray-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All Files
                  </button>
                </div>
              </div>

              {/* Code viewer */}
              <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed text-gray-300 select-text">
                <pre>{file.code}</pre>
              </div>
            </div>
          </div>
        ) : (
          /* Instructions Tab */
          <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#121318]">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Banner */}
              <div className="p-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-2xl border border-indigo-500/30 text-white space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                  <Terminal className="w-5 h-5" />
                  3-Step Android APK Generation Guide
                </div>
                <h3 className="text-xl font-bold">Build "BookNest" APK using Expo EAS Cloud Build</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  You can compile this exact mobile codebase into an Android <code className="bg-black/50 px-1.5 py-0.5 rounded text-indigo-300">.apk</code> file in under 3 minutes using the official, free Expo Cloud Build service (<code className="bg-black/50 px-1.5 py-0.5 rounded text-indigo-300">eas build</code>).
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-6 bg-[#1E1F28] rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <h4 className="text-base font-bold text-white">Initialize Project & Paste Code</h4>
                </div>
                <p className="text-sm text-gray-400 pl-11">
                  Run the following terminal command on your computer to create an Expo app and install required dependencies:
                </p>
                <div className="ml-11 p-3 bg-black/60 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto border border-gray-800">
                  npx create-expo-app BookNest -t expo-template-blank-typescript<br />
                  cd BookNest<br />
                  npx expo install expo-sqlite expo-document-picker expo-file-system react-native-webview axios @react-navigation/native @react-navigation/native-stack
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 bg-[#1E1F28] rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                    2
                  </div>
                  <h4 className="text-base font-bold text-white">Configure EAS Build Profile</h4>
                </div>
                <p className="text-sm text-gray-400 pl-11">
                  Create <code className="text-indigo-400">eas.json</code> in your project root with preview APK profile:
                </p>
                <div className="ml-11 p-3 bg-black/60 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto border border-gray-800">
                  {`{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}`}
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 bg-[#1E1F28] rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                    3
                  </div>
                  <h4 className="text-base font-bold text-white">Trigger Build & Download APK</h4>
                </div>
                <p className="text-sm text-gray-400 pl-11">
                  Run the free build command to receive your direct Android APK download link:
                </p>
                <div className="ml-11 p-3 bg-black/60 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto border border-gray-800">
                  npm install -g eas-cli<br />
                  eas build -p android --profile preview
                </div>
                <p className="text-xs text-emerald-400 font-medium pl-11 flex items-center gap-1.5 pt-1">
                  <Check className="w-4 h-4" />
                  Once finished, scan the QR code or click the download link provided by EAS to install the APK directly onto your Android device!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
