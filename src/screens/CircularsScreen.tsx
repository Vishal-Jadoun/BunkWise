import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CircularItem, CircularAttachment } from '../types';
import { CampaignIcon } from '../components/icons';
import {
  ArrowLeft, Bell, X, Search,
  Paperclip, FileText, ChevronRight,
  Bookmark, BookmarkCheck
} from 'lucide-react';
import { DocumentViewer } from '../components/common/DocumentViewer';

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

export const CircularsScreen: React.FC = () => {
  const { circulars, markCircularRead, navigate, theme } = useApp();
  const [filter, setFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<CircularAttachment | null>(null);

  // Saved / Bookmarked items persisted in localStorage
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('attendly_saved_circulars');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('attendly_saved_circulars', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filters = ['All', 'Academic', 'Events', 'Notice', 'Placement', 'Saved'];

  const filteredCirculars = useMemo(() => {
    let result = circulars;

    // Filter by type or saved
    if (filter === 'Saved') {
      result = result.filter(c => savedIds.includes(c.id));
    } else if (filter !== 'All') {
      result = result.filter(c => c.type.toLowerCase() === filter.toLowerCase());
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
      );
    }

    return result;
  }, [circulars, filter, searchQuery, savedIds]);

  const unreadCount = circulars.filter(c => c.unread).length;

  const handleMarkAllRead = () => {
    circulars.forEach(c => {
      if (c.unread) markCircularRead(c.id);
    });
  };

  // Group by category
  const yesterdayItems = filteredCirculars.filter(c => c.category === 'Yesterday');
  const thisWeekItems = filteredCirculars.filter(c => c.category === 'This Week');
  const earlierItems = filteredCirculars.filter(c => c.category === 'Earlier');

  const handleOpenNotice = (notice: CircularItem) => {
    markCircularRead(notice.id);
    navigate(`/circulars/${notice.id}`);
  };

  const handleOpenAttachment = (attachment: CircularAttachment) => {
    setViewingDocument(attachment);
  };

  const isDark = theme === 'dark';

  const renderAttachmentChip = (att: CircularAttachment, idx: number) => {
    const ft = inferFileType(att);
    const isPDF = ft === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ft);

    return (
      <button
        key={idx}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenAttachment(att);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02] ${
          isPDF
            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
            : isImage
            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20'
            : isDark
            ? 'bg-[#222428] text-gray-300 border border-[#2A2A2A] hover:bg-[#2A2A2A]'
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        }`}
        title={att.name}
      >
        {isPDF ? <FileText size={12} /> : <Paperclip size={12} />}
        <span className="truncate max-w-[110px]">{att.name || `Attachment ${idx + 1}`}</span>
        {att.sizeBytes && (
          <span className="opacity-60">{formatFileSize(att.sizeBytes)}</span>
        )}
      </button>
    );
  };

  const renderNoticeCard = (notice: CircularItem) => {
    const isSaved = savedIds.includes(notice.id);

    return (
      <div
        key={notice.id}
        onClick={() => handleOpenNotice(notice)}
        className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${
          notice.unread
            ? isDark
              ? 'bg-[#141517] border-[#FF7A00]/30 hover:border-[#FF7A00]/60 shadow-[0_0_12px_rgba(255,122,0,0.05)]'
              : 'bg-white border-[#FF7A00]/30 hover:border-[#FF7A00]/60 shadow-sm'
            : isDark
              ? 'bg-[#141517] border-[#222428] hover:border-[#333]'
              : 'bg-white border-[#E8E8E8] hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FF7A00]/15 text-[#FF7A00]">
              {notice.type}
            </span>
            {notice.unread && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                <span className="text-[9px] font-bold text-[#FF7A00] uppercase tracking-wide">New</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {notice.creDate}
            </span>
            <button
              onClick={(e) => toggleBookmark(notice.id, e)}
              className={`p-1 -mr-1 rounded-full hover:bg-white/10 transition-colors ${
                isSaved ? 'text-[#FF7A00]' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save circular'}
              aria-label={isSaved ? 'Remove from saved' : 'Save circular'}
            >
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>
        </div>

        <h3 className={`text-sm font-bold mb-1.5 leading-snug group-hover:text-[#FF7A00] transition-colors pr-6 ${
          notice.unread ? 'text-[#FF7A00]' : ''
        }`}>
          {notice.title}
        </h3>

        <p className={`text-xs line-clamp-2 leading-relaxed ${
          isDark ? 'text-[#A0A0A0]' : 'text-[#7A7570]'
        }`}>
          {notice.desc}
        </p>

        {/* Attachment indicators */}
        {notice.attachments && notice.attachments.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {notice.attachments.map((att, idx) => renderAttachmentChip(att, idx))}
          </div>
        )}

        {/* Tap to view indicator */}
        <div className={`flex items-center justify-between mt-2.5 pt-2 border-t text-[10px] font-medium ${
          isDark ? 'border-[#1E1E22] text-gray-500' : 'border-gray-100 text-gray-400'
        }`}>
          <div className="flex items-center gap-1">
            <span>Tap to read announcement</span>
            <ChevronRight size={12} />
          </div>
          {isSaved && (
            <span className="text-[10px] text-[#FF7A00] font-semibold flex items-center gap-1">
              <BookmarkCheck size={11} /> Saved
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderGroupSection = (title: string, items: CircularItem[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h2 className={`text-xs font-bold tracking-wider uppercase mb-2.5 flex items-center gap-2 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span>{title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            isDark ? 'bg-[#222428]' : 'bg-gray-200'
          }`}>
            {items.length}
          </span>
        </h2>
        <div className="space-y-2.5">
          {items.map(renderNoticeCard)}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 pb-28 ${
      isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          isDark ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Circulars</h1>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF7A00] text-white font-bold">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                isDark ? 'border-[#2A2A2A] text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title="Mark all circulars as read"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${
              showSearch ? 'bg-[#FF7A00]/15 text-[#FF7A00]' : 'hover:bg-white/10'
            }`}
            aria-label="Toggle search"
          >
            <Search size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center">
            <CampaignIcon size={18} color="currentColor" />
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-5 pt-3 pb-1">
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-colors ${
            isDark ? 'bg-[#141517] border-[#222428] focus-within:border-[#FF7A00]/50' : 'bg-white border-[#E8E8E8] focus-within:border-[#FF7A00]/50'
          }`}>
            <Search size={16} className="opacity-40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, keywords or type..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="px-5 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map(f => {
          const isFilterActive = filter === f;
          const count = f === 'Saved' ? savedIds.length : null;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isFilterActive
                  ? 'bg-[#FF7A00] text-white shadow-sm shadow-[#FF7A00]/20'
                  : isDark
                  ? 'bg-[#141517] border border-[#222428] text-gray-300 hover:border-gray-600'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f === 'Saved' && <Bookmark size={12} className={isFilterActive ? 'fill-current' : ''} />}
              <span>{f}</span>
              {count !== null && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isFilterActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Notice List */}
      <main className="px-5 pt-3 space-y-5">
        {searchQuery && (
          <p className={`text-[11px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {filteredCirculars.length} result{filteredCirculars.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {renderGroupSection('Yesterday', yesterdayItems)}
        {renderGroupSection('This Week', thisWeekItems)}
        {renderGroupSection('Earlier', earlierItems)}

        {filteredCirculars.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-700/30 my-4">
            {filter === 'Saved' ? (
              <>
                <Bookmark size={32} className="mx-auto text-gray-400 mb-2 opacity-60" />
                <p className="text-sm font-semibold">No Saved Circulars</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tap the bookmark icon on any circular to save it here for fast access.
                </p>
              </>
            ) : (
              <>
                <Bell size={32} className="mx-auto text-gray-400 mb-2 opacity-60" />
                <p className="text-sm font-semibold">
                  {searchQuery ? 'No circulars match your search' : 'No circulars in this category'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilter('All'); }}
                    className="mt-2 text-xs text-[#FF7A00] font-semibold hover:underline"
                  >
                    Clear search & filters
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Document Viewer Overlay */}
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
