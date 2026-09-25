import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Video,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  FileText,
  Plus,
  Trash2,
  Lock,
  Globe,
  Upload,
  ExternalLink,
  Eye,
  X,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { StorageItem } from '../types.ts';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StorageExplorerProps {
  onBack?: () => void;
  targetUserId?: string; // If viewing another creator's public storage
  creatorName?: string;
}

export const StorageExplorer: React.FC<StorageExplorerProps> = ({ onBack, targetUserId, creatorName }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [items, setItems] = useState<StorageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'image' | 'audio' | 'link' | 'note'>('all');
  const [activeVisibility, setActiveVisibility] = useState<'all' | 'public' | 'private'>('all');

  // New item modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'video' | 'image' | 'audio' | 'link' | 'note'>('note');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalVisibility, setModalVisibility] = useState<'public' | 'private'>('private');
  const [modalLinkUrl, setModalLinkUrl] = useState('');
  const [modalTextContent, setModalTextContent] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Item preview modal (for notes or full view)
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isViewingSelf = !targetUserId || (user && user.id === targetUserId);

  const loadStorageItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getStorageItems({
        userId: targetUserId,
      });
      setItems(res.items || []);
    } catch (err: any) {
      console.error('Failed to load storage items:', err);
      setError(err.message || 'Failed to load storage items from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStorageItems();
  }, [targetUserId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedUploadFile(file);
      if (!modalTitle) {
        setModalTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (!modalTitle.trim()) {
      setError('Please provide a title for this item.');
      return;
    }

    setIsSubmitting(true);
    setUploadStatus('Processing...');
    setError(null);

    try {
      let fileUrl = '';
      let storagePath = '';

      if (['video', 'image', 'audio'].includes(modalType) && selectedUploadFile) {
        setUploadStatus(`Uploading ${selectedUploadFile.name} permanently to Supabase Storage...`);
        const uploadResult = await api.uploadStorageRawFile(selectedUploadFile);
        fileUrl = uploadResult.url;
        storagePath = uploadResult.storagePath || uploadResult.path;
      }

      setUploadStatus('Saving record to Supabase database...');
      const created = await api.createStorageItem({
        type: modalType,
        title: modalTitle.trim(),
        description: modalDescription.trim() || undefined,
        fileUrl: fileUrl || undefined,
        storagePath: storagePath || undefined,
        linkUrl: modalType === 'link' ? modalLinkUrl.trim() : undefined,
        textContent: modalType === 'note' ? modalTextContent.trim() : undefined,
        visibility: modalVisibility,
      });

      setItems((prev) => [created, ...prev]);
      setIsModalOpen(false);
      resetModal();
    } catch (err: any) {
      console.error('Failed to create storage item:', err);
      setError(err.message || 'Failed to save storage item.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const resetModal = () => {
    setModalTitle('');
    setModalDescription('');
    setModalLinkUrl('');
    setModalTextContent('');
    setSelectedUploadFile(null);
    setModalVisibility('private');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item from Supabase Storage?')) return;

    try {
      await api.deleteStorageItem(itemId);
      setItems((prev) => prev.filter((x) => x.id !== itemId));
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      alert(err.message || 'Failed to delete item.');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesType = activeFilter === 'all' || item.type === activeFilter;
    const matchesVisibility =
      activeVisibility === 'all' ||
      (activeVisibility === 'public' && item.visibility === 'public') ||
      (activeVisibility === 'private' && item.visibility === 'private');
    return matchesType && matchesVisibility;
  });

  return (
    <div id="storage-explorer-view" className="w-full text-neutral-100 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 mr-1"
              >
                ← Back
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
              {creatorName ? `${creatorName}'s Storage` : 'Explorer Cloud Storage'}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isViewingSelf
              ? 'Permanently save videos, photos, audio, links, and notes to Supabase with Public/Private visibility.'
              : `Browse public items shared by @${creatorName || 'creator'}.`}
          </p>
        </div>

        {isViewingSelf && (
          <button
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              resetModal();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Store New Item</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Visibility Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        {/* Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {[
            { id: 'all', label: 'All Items', icon: FolderOpen },
            { id: 'video', label: 'Videos', icon: Video },
            { id: 'image', label: 'Photos', icon: ImageIcon },
            { id: 'audio', label: 'Audio', icon: Music },
            { id: 'link', label: 'Links', icon: LinkIcon },
            { id: 'note', label: 'Notes', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Visibility Filter (for self view) */}
        {isViewingSelf && (
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
            <span className="text-[11px] text-neutral-500 px-2 font-medium">Visibility:</span>
            <button
              onClick={() => setActiveVisibility('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                activeVisibility === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveVisibility('public')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                activeVisibility === 'public'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              Public
            </button>
            <button
              onClick={() => setActiveVisibility('private')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                activeVisibility === 'private'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              Private
            </button>
          </div>
        )}
      </div>

      {/* Content List / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
          <p className="text-xs">Loading items from Supabase Storage...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-500 mx-auto mb-3">
            <HardDrive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Stored Items Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            {isViewingSelf
              ? 'You have not uploaded any storage items yet. Click "Store New Item" above to permanently save files or notes.'
              : 'This creator does not have any public storage items available right now.'}
          </p>
          {isViewingSelf && (
            <button
              onClick={() => {
                if (!isAuthenticated) openAuthModal('login');
                else setIsModalOpen(true);
              }}
              className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
            >
              Store First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isOwner = user && user.id === item.userId;
            return (
              <div
                key={item.id}
                className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                          item.type === 'video'
                            ? 'bg-purple-500/15 text-purple-400'
                            : item.type === 'image'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.type === 'audio'
                            ? 'bg-amber-500/15 text-amber-400'
                            : item.type === 'link'
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-indigo-500/15 text-indigo-400'
                        }`}
                      >
                        {item.type === 'video' && <Video className="w-3.5 h-3.5" />}
                        {item.type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                        {item.type === 'audio' && <Music className="w-3.5 h-3.5" />}
                        {item.type === 'link' && <LinkIcon className="w-3.5 h-3.5" />}
                        {item.type === 'note' && <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.visibility === 'public'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.visibility === 'public' ? (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </>
                        )}
                      </span>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                          title="Delete from Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1 mb-1 font-['Outfit',sans-serif]">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Media Preview or Render */}
                  {item.type === 'image' && item.fileUrl && (
                    <div className="my-2 rounded-xl overflow-hidden bg-black/40 border border-neutral-800 aspect-video flex items-center justify-center">
                      <img
                        src={item.fileUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {item.type === 'video' && item.fileUrl && (
                    <div className="my-2 rounded-xl overflow-hidden bg-black border border-neutral-800">
                      <video
                        src={item.fileUrl}
                        controls
                        playsInline
                        className="w-full max-h-40 object-cover"
                      />
                    </div>
                  )}

                  {item.type === 'audio' && item.fileUrl && (
                    <div className="my-2 p-2 bg-neutral-950 rounded-xl border border-neutral-800">
                      <audio src={item.fileUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  {item.type === 'link' && item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="my-2 flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-sky-400 hover:text-sky-300 hover:border-sky-500/40 transition-colors break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.linkUrl}</span>
                    </a>
                  )}

                  {item.type === 'note' && item.textContent && (
                    <div
                      onClick={() => setPreviewItem(item)}
                      className="my-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 line-clamp-3 font-mono cursor-pointer hover:border-neutral-700 transition-colors"
                    >
                      {item.textContent}
                    </div>
                  )}
                </div>

                {/* Card Bottom Meta */}
                <div className="pt-3 mt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>By @{item.username}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  Add to Supabase Storage
                </h3>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Select Content Type
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'note', label: 'Note', icon: FileText },
                    { id: 'link', label: 'Link', icon: LinkIcon },
                    { id: 'image', label: 'Photo', icon: ImageIcon },
                    { id: 'video', label: 'Video', icon: Video },
                    { id: 'audio', label: 'Audio', icon: Music },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = modalType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setModalType(t.id as any);
                          setSelectedUploadFile(null);
                        }}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 shadow-sm'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-850'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="e.g. My Lagos Studio Session Notes"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="Additional context or notes..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Specific inputs according to type */}
              {['image', 'video', 'audio'].includes(modalType) && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Select {modalType === 'image' ? 'Photo / Image' : modalType === 'video' ? 'Video File' : 'Audio File'} *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required={!selectedUploadFile}
                    accept={
                      modalType === 'image'
                        ? 'image/*'
                        : modalType === 'video'
                        ? 'video/*'
                        : 'audio/*'
                    }
                    onChange={handleFileChange}
                    className="w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 cursor-pointer bg-neutral-950 p-2 rounded-xl border border-neutral-800"
                  />
                  {selectedUploadFile && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                      Selected: {selectedUploadFile.name} ({(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {modalType === 'link' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">URL / Link *</label>
                  <input
                    type="url"
                    required
                    disabled={isSubmitting}
                    placeholder="https://example.com/resource"
                    value={modalLinkUrl}
                    onChange={(e) => setModalLinkUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {modalType === 'note' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Written Note / Text Content *
                  </label>
                  <textarea
                    rows={4}
                    required
                    disabled={isSubmitting}
                    placeholder="Write your note, idea, draft, or memo here..."
                    value={modalTextContent}
                    onChange={(e) => setModalTextContent(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Visibility Setting */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Storage Visibility Setting
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setModalVisibility('public')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      modalVisibility === 'public'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setModalVisibility('private')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      modalVisibility === 'private'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {modalVisibility === 'public'
                    ? 'Public: Other users will be able to see this item on your profile.'
                    : 'Private: Only you can see this item. Other users cannot access it.'}
                </p>
              </div>

              {uploadStatus && (
                <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Save to Storage</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                {previewItem.title}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs text-neutral-200 whitespace-pre-wrap max-h-72 overflow-y-auto">
              {previewItem.textContent}
            </div>
            <div className="mt-3 text-[10px] text-neutral-500 text-right">
              Stored on {new Date(previewItem.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
