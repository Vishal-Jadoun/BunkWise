import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CircularItem, CircularAttachment } from '../types';
import {
  ArrowLeft, Calendar, FileText, Download,
  Bookmark, BookmarkCheck, Loader2, Paperclip, AlertCircle, Eye
} from 'lucide-react';
import { DocumentViewer } from '../components/common/DocumentViewer';
import { schoolPadApi } from '../services/schoolpadApi';

function inferFileType(att: CircularAttachment): string {
  if (att.fileType) return att.fileType.toLowerCase();
  const name = att.name || att.url || '';
  const ext = name.split('.').pop()?.toLowerCase().split('?')[0] || '';
  return ext || 'file';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CircularDetailScreenProps {
  circularId: string;
}

export const CircularDetailScreen: React.FC<CircularDetailScreenProps> = ({ circularId }) => {
  const { circulars, markCircularRead, navigate, theme, isDemoMode } = useApp();

  const [notice, setNotice] = useState<CircularItem | null>(() => {
    return circulars.find((c) => c.id === circularId) || null;
  });

  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [viewingDocument, setViewingDocument] = useState<CircularAttachment | null>(null);

  // Saved / Bookmarked items persisted in localStorage
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('attendly_saved_circulars');
      const list: string[] = saved ? JSON.parse(saved) : [];
      return list.includes(circularId);
    } catch {
      return false;
    }
  });

  const toggleBookmark = () => {
    try {
      const saved = localStorage.getItem('attendly_saved_circulars');
      const list: string[] = saved ? JSON.parse(saved) : [];
      const next = list.includes(circularId) ? list.filter((x) => x !== circularId) : [...list, circularId];
      localStorage.setItem('attendly_saved_circulars', JSON.stringify(next));
      setIsSaved(next.includes(circularId));
    } catch {}
  };

  // Sync notice if circulars list updates
  useEffect(() => {
    const found = circulars.find((c) => c.id === circularId);
    if (found) {
      setNotice(found);
      markCircularRead(found.id);
    }
  }, [circulars, circularId, markCircularRead]);

  // Load full details & attachments asynchronously on real account
  useEffect(() => {
    if (!notice) return;
    if (isDemoMode) return;

    // If attachments aren't loaded or rawDesc missing, fetch notice details
    if (!notice.attachments || notice.attachments.length === 0) {
      let isMounted = true;
      setIsLoadingDetails(true);

      schoolPadApi
        .getNoticeDetails(notice.id, notice.type)
        .then((details) => {
          if (!isMounted || !details) return;
          setNotice((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              desc: details.desc || prev.desc,
              rawDesc: details.rawDesc || prev.rawDesc,
              attachments: details.attachments || prev.attachments,
            };
          });
        })
        .catch((err) => {
          console.error('Failed to load circular details:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingDetails(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [notice?.id, notice?.type, isDemoMode]);

  const isDark = theme === 'dark';

  if (!notice) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${
          isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
        }`}
      >
        <AlertCircle size={40} className="text-gray-400 mb-3" />
        <h2 className="text-base font-bold mb-1">Circular Not Found</h2>
        <p className="text-xs opacity-60 mb-5">
          The requested circular could not be found or may have been removed.
        </p>
        <button
          onClick={() => navigate('/circulars')}
          className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] transition-colors"
        >
          Return to Circulars
        </button>
      </div>
    );
  }

  const attachments = notice.attachments || [];

  return (
    <div
      className={`flex-1 flex flex-col transition-colors duration-300 pb-28 min-h-screen ${
        isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          isDark ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/circulars')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back to circulars list"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-sm font-bold tracking-tight opacity-70 uppercase">Official Circular</span>
        </div>

        <button
          onClick={toggleBookmark}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark circular'}
        >
          {isSaved ? (
            <BookmarkCheck size={20} className="text-[#FF7A00]" />
          ) : (
            <Bookmark size={20} className="opacity-60 hover:opacity-100" />
          )}
        </button>
      </header>

      {/* Main Content Article */}
      <main className="px-5 pt-4 space-y-5 flex-1">
        {/* Meta badges: Category & Date */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FF7A00]/15 text-[#FF7A00] uppercase tracking-wider">
            {notice.type}
          </span>
          <div className="flex items-center gap-1.5 text-xs opacity-60">
            <Calendar size={13} />
            <span>{notice.creDate}</span>
          </div>
        </div>

        {/* Circular Title */}
        <h1 className="text-xl font-extrabold leading-snug tracking-tight">
          {notice.title}
        </h1>

        {/* Circular Content / Description */}
        <div
          className={`p-5 rounded-2xl border transition-colors ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap opacity-90">
            {notice.rawDesc ? (
              <div
                dangerouslySetInnerHTML={{ __html: notice.rawDesc }}
                className="space-y-2 [&_p]:mb-2 [&_a]:text-[#FF7A00] [&_a]:underline"
              />
            ) : (
              <p>{notice.desc || 'No further description provided.'}</p>
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Paperclip size={14} className="text-[#FF7A00]" />
              <span>Attachments ({attachments.length})</span>
            </h2>
            {isLoadingDetails && (
              <div className="flex items-center gap-1 text-[11px] text-[#FF7A00]">
                <Loader2 size={12} className="animate-spin" />
                <span>Checking attachments...</span>
              </div>
            )}
          </div>

          {attachments.length === 0 ? (
            <div
              className={`p-4 rounded-xl border text-center text-xs opacity-50 ${
                isDark ? 'border-[#222428] bg-white/5' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {isLoadingDetails
                ? 'Retrieving attachment metadata from Chitkara server...'
                : 'No document attachments accompany this circular.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {attachments.map((att, idx) => {
                const ft = inferFileType(att);
                const isPdf = ft === 'pdf';
                const fileSize = formatFileSize(att.sizeBytes);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
                      isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                    }`}
                  >
                    {/* Attachment icon & info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{att.name || 'Official Document'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-60">
                          <span className="uppercase font-semibold">{ft.toUpperCase()}</span>
                          {fileSize && <span>• {fileSize}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Open Document & Download */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPdf && (
                        <button
                          onClick={() => setViewingDocument(att)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] shadow-sm transition-all"
                        >
                          <Eye size={13} />
                          <span>Open</span>
                        </button>
                      )}
                      <button
                        onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isDark
                            ? 'border-[#2E3035] text-gray-300 hover:bg-white/10'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Download / Open source URL"
                        aria-label="Download attachment"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* In-app Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          attachment={viewingDocument}
          onClose={() => setViewingDocument(null)}
          theme={theme}
        />
      )}
    </div>
  );
};
