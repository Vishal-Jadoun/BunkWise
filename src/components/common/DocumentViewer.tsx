import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  X, Download, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RefreshCw, AlertTriangle, FileText, Loader2
} from 'lucide-react';
import { CircularAttachment } from '../../types';

// Configure PDF.js worker using local public worker with unpkg fallback
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/pdf.worker.min.mjs`
    : `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface DocumentViewerProps {
  attachment: CircularAttachment;
  onClose: () => void;
  theme: string;
  /** Proxy function to build authenticated URL */
  proxyUrl?: (url: string) => string;
}

function inferFileType(attachment: CircularAttachment): string {
  if (attachment.fileType) return attachment.fileType.toLowerCase();
  const url = attachment.url || '';
  const name = attachment.name || '';
  const ext = (name.split('.').pop() || url.split('.').pop() || '').toLowerCase().split('?')[0];
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  return ext || 'unknown';
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  attachment, onClose, theme, proxyUrl
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(window.innerWidth - 32, 380);
    }
    return 380;
  });

  useEffect(() => {
    const handleResize = () => {
      setPageWidth(Math.min(window.innerWidth - 32, 380));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileType = inferFileType(attachment);
  const fileUrl = proxyUrl ? proxyUrl(attachment.url) : attachment.url;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setLoading(false);
    setError(
      err.message.includes('CORS') || err.message.includes('cross-origin')
        ? 'This document cannot be embedded due to CORS restrictions from the server. Use the download option instead.'
        : err.message.includes('Invalid PDF') || err.message.includes('worker')
        ? 'The file could not be parsed as a valid PDF. It may be corrupted or in an unsupported format.'
        : `Failed to load document: ${err.message}`
    );
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const handleDownload = () => {
    // Open in new tab with the original URL, not the proxied one
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(numPages, page)));
  };

  const adjustZoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F8F7F4]';
  const cardBg = isDark ? 'bg-[#141517]' : 'bg-white';
  const borderColor = isDark ? 'border-[#222428]' : 'border-[#E8E8E8]';

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F0F0F0' }}>
      {/* Top toolbar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${bg} ${borderColor}`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close viewer"
          >
            <X size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{attachment.name || 'Document'}</p>
            <p className="text-[10px] opacity-50 uppercase">{fileType.toUpperCase()} Document</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] transition-colors shrink-0"
          title="Download file"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      {/* Document area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {fileType === 'pdf' ? (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={28} className="text-[#FF7A00] animate-spin" />
                <p className="text-xs font-medium opacity-70">Loading PDF...</p>
              </div>
            )}

            {error ? (
              <div className={`max-w-sm mx-auto p-6 rounded-2xl border text-center ${cardBg} ${borderColor}`}>
                <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
                <h3 className="text-sm font-bold mb-2">Cannot Display Document</h3>
                <p className="text-xs opacity-70 leading-relaxed mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleRetry}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border ${borderColor} hover:bg-white/5 transition-colors`}
                  >
                    <RefreshCw size={13} /> Retry
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] transition-colors"
                  >
                    <Download size={13} /> Download Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-xl shadow-lg overflow-hidden ${cardBg}`} style={{ display: loading ? 'none' : 'block' }}>
                <Document
                  key={retryCount}
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading=""
                >
                  <Page
                    pageNumber={currentPage}
                    width={pageWidth * scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="mx-auto"
                  />
                </Document>
              </div>
            )}
          </>
        ) : fileType === 'image' ? (
          <div className={`rounded-xl overflow-hidden shadow-lg ${cardBg}`}>
            <img
              src={fileUrl}
              alt={attachment.name}
              className="max-w-full max-h-[80vh] object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('Could not load image. The file may be restricted or unavailable.');
              }}
            />
          </div>
        ) : fileType === 'docx' ? (
          <div className={`max-w-sm mx-auto p-6 rounded-2xl border text-center ${cardBg} ${borderColor}`}>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto mb-3">
              <FileText size={32} />
            </div>
            <h3 className="text-sm font-bold mb-1">{attachment.name || 'Word Document'}</h3>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 mb-3">
              Microsoft Word (.docx)
            </span>
            <p className="text-xs opacity-70 leading-relaxed mb-2">
              In-app direct rendering of proprietary Word documents is restricted by security policies and formatting fidelity.
            </p>
            <p className="text-xs opacity-50 leading-relaxed mb-5">
              You can open this document online or download the authorized file to view with Microsoft Word or Google Docs.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(attachment.url)}`, '_blank', 'noopener,noreferrer')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border ${borderColor} hover:bg-white/5 text-xs font-semibold transition-colors`}
              >
                <span>Preview with Google Docs</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] transition-colors"
              >
                <Download size={14} />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unsupported file type fallback */
          <div className={`max-w-sm mx-auto p-6 rounded-2xl border text-center ${cardBg} ${borderColor}`}>
            <FileText size={36} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-sm font-bold mb-2">Preview Not Available</h3>
            <p className="text-xs opacity-70 leading-relaxed mb-1">
              In-app preview is not supported for <strong>.{fileType}</strong> files.
            </p>
            <p className="text-xs opacity-50 leading-relaxed mb-4">
              You can download the file and open it with a compatible application on your device.
            </p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] transition-colors mx-auto"
            >
              <Download size={14} /> Download File
            </button>
          </div>
        )}
      </div>

      {/* Bottom toolbar for PDF navigation */}
      {fileType === 'pdf' && numPages > 0 && !error && (
        <div className={`flex items-center justify-between px-4 py-2.5 border-t ${bg} ${borderColor}`}>
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-25 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-semibold min-w-[80px] text-center">
              Page {currentPage} / {numPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-25 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustZoom(-0.2)}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-25 transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-[11px] font-semibold min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => adjustZoom(0.2)}
              disabled={scale >= 3.0}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-25 transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
