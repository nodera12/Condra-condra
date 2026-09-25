import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Video as VideoIcon,
  Music,
  Tag,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Film,
  HardDrive,
  Trash2,
  LogIn,
  Lock,
  Globe,
  DollarSign,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Video as VideoType } from '../types.ts';
import { uploadVideoFile, deleteVideoStorageFile } from '../lib/supabase.ts';
import { isSupabaseConfigured } from '../lib/supabaseConfig.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newVideo: VideoType) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(15);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('Shorts, MrFelix, Viral');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [viewingPrice, setViewingPrice] = useState<number>(100);

  // Upload progress & state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadStage('');
      if (user && !musicTitle) {
        setMusicTitle(`${user.username} Original Sound`);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Enforce authentication
  if (!isAuthenticated || !user) {
    return (
      <div
        id="video-upload-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        onClick={onClose}
      >
        <div
          id="video-upload-auth-gate"
          className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
            <LogIn className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-white font-['Outfit',sans-serif] mb-2">
            Sign In to Upload Videos
          </h3>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            You must be signed in with your account to upload and publish real videos to the Mr Felix video network.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                openAuthModal('login');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              Sign In to Your Account
            </button>
            <button
              onClick={() => {
                onClose();
                openAuthModal('register');
              }}
              className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFileSelect = (file: File) => {
    setError(null);

    const lowerName = file.name.toLowerCase();
    const validExtensions = ['.mp4', '.webm', '.mov'];
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    const isValidMime =
      file.type.startsWith('video/') ||
      file.type === 'video/mp4' ||
      file.type === 'video/webm' ||
      file.type === 'video/quicktime';

    if (!isValidExt && !isValidMime) {
      setError('Unsupported video format. Please choose an MP4, WebM, or MOV video file.');
      return;
    }

    const maxBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxBytes) {
      setError(`Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 100MB.`);
      return;
    }

    // Clean up old preview URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);

    // Auto-populate title if empty
    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setTitle(cleanName);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoMetadataLoaded = () => {
    if (previewVideoRef.current) {
      const dur = Math.round(previewVideoRef.current.duration) || 15;
      setDuration(dur);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a video file from your device to upload.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a title for your video.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setUploadProgress(10);
    setUploadStage('Validating video file and user credentials...');

    let uploadedStoragePath: string | null = null;

    try {
      let videoPublicUrl = '';

      if (isSupabaseConfigured()) {
        // 1. Upload to Supabase Storage in 'videos' bucket under user's folder
        setUploadProgress(30);
        setUploadStage(`Uploading "${selectedFile.name}" to Supabase Storage (videos bucket)...`);

        const progressTimer = setInterval(() => {
          setUploadProgress((prev) => (prev < 75 ? prev + 5 : prev));
        }, 300);

        const storageResult = await uploadVideoFile(selectedFile, user.id);
        clearInterval(progressTimer);

        uploadedStoragePath = storageResult.storagePath;
        videoPublicUrl = storageResult.url;
        setUploadProgress(80);
        setUploadStage('Video uploaded to Supabase Storage! Securing public URL...');
      } else {
        // Fallback to platform media storage stream when Supabase keys are not yet pasted
        setUploadProgress(30);
        setUploadStage(`Uploading "${selectedFile.name}" to platform media storage...`);

        const progressTimer = setInterval(() => {
          setUploadProgress((prev) => (prev < 75 ? prev + 5 : prev));
        }, 300);

        const storageResult = await api.uploadRawVideoFile(selectedFile);
        clearInterval(progressTimer);

        uploadedStoragePath = storageResult.storagePath;
        videoPublicUrl = storageResult.url;
        setUploadProgress(80);
        setUploadStage('Video stored successfully! Saving metadata...');
      }

      // 2. Save metadata to database (videos table)
      setUploadProgress(90);
      setUploadStage('Saving video record to Mr Felix feed...');

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      let createdVideo: VideoType;
      try {
        createdVideo = await api.uploadVideo({
          creatorId: user.id,
          creatorUsername: user.username,
          creatorAvatar: user.avatarUrl,
          title: title.trim(),
          description: description.trim(),
          videoUrl: videoPublicUrl,
          storagePath: uploadedStoragePath || undefined,
          posterUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
          musicTitle: musicTitle.trim() || `${user.username} Original Sound`,
          tags: tags.length > 0 ? tags : ['MrFelix'],
          duration,
          visibility,
          viewingPrice: visibility === 'private' ? Number(viewingPrice) || 0 : 0,
        });
      } catch (dbErr: any) {
        // If database insertion failed after successful storage upload,
        // safely remove the uploaded storage file to prevent orphaned storage objects!
        if (uploadedStoragePath && isSupabaseConfigured()) {
          console.warn('Database save failed. Cleaning up storage file:', uploadedStoragePath);
          await deleteVideoStorageFile(uploadedStoragePath);
        }
        throw new Error(`Database record creation failed: ${dbErr.message || 'Please check your connection.'}`);
      }

      setUploadProgress(100);
      setUploadStage('Success! Video published to Mr Felix video feed.');

      setTimeout(() => {
        onSuccess(createdVideo);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Video upload failed:', err);
      setError(err.message || 'Failed to upload video to Supabase. Please try again.');
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  return (
    <div
      id="video-upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        id="video-upload-card"
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!isSubmitting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
              Upload Video
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${
                  isSupabaseConfigured()
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {isSupabaseConfigured() ? 'Supabase Storage' : 'Direct Video Upload'}
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Uploading as <span className="text-amber-300 font-semibold">@{user.username}</span>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker / Drag & Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Select Video File *</span>
              <span className="text-[11px] text-neutral-400 font-normal">MP4, WebM, MOV (Max 100MB)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-input-video"
              disabled={isSubmitting}
            />

            {!selectedFile ? (
              <div
                id="video-dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-neutral-700 hover:border-amber-400/70 bg-neutral-950/60 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-800 group-hover:bg-amber-500/15 group-hover:border group-hover:border-amber-500/30 flex items-center justify-center text-neutral-400 group-hover:text-amber-400 mx-auto mb-2 transition-all">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                  Click to select a video or drag & drop
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Works on phones, tablets, and computers
                </p>
              </div>
            ) : (
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-neutral-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Video'}
                      </p>
                    </div>
                  </div>

                  {!isSubmitting && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Video Preview Player */}
                {previewUrl && (
                  <div className="rounded-lg overflow-hidden bg-black border border-neutral-800 relative max-h-48 flex items-center justify-center">
                    <video
                      ref={previewVideoRef}
                      src={previewUrl}
                      controls
                      playsInline
                      onLoadedMetadata={handleVideoMetadataLoaded}
                      className="max-h-48 w-auto mx-auto"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Video Title *
            </label>
            <input
              id="input-upload-title"
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g. Lagos Sunset Rooftop Vibes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Description & Hashtags */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Description & Caption
            </label>
            <textarea
              id="input-upload-description"
              rows={2}
              disabled={isSubmitting}
              placeholder="Tell viewers what this video is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Audio Title and Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Music className="w-3 h-3 text-amber-400" />
                <span>Audio / Sound Title</span>
              </label>
              <input
                id="input-upload-music"
                type="text"
                disabled={isSubmitting}
                placeholder={`${user.username} Original Audio`}
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Tags (comma separated)</span>
              </label>
              <input
                id="input-upload-tags"
                type="text"
                disabled={isSubmitting}
                placeholder="Shorts, Viral, Music"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Video Privacy & Pay-to-Watch Option */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Video Visibility</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setVisibility('public')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    visibility === 'public'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setVisibility('private')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    visibility === 'private'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private / Paid</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                {visibility === 'public'
                  ? 'Public: Video appears normally on the Home feed and is freely viewable by everyone.'
                  : 'Private: Video is locked. Viewers must pay your viewing price to watch, and proceeds are credited directly to your creator wallet.'}
              </p>
            </div>

            {/* If Private, show Set Viewing Price */}
            {visibility === 'private' && (
              <div className="pt-2.5 border-t border-neutral-800/80 space-y-2 animate-in fade-in">
                <label className="block text-xs font-medium text-neutral-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Set viewing price:</span>
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">₦{viewingPrice.toLocaleString()}</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[50, 100, 150, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setViewingPrice(preset)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all ${
                        viewingPrice === preset
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-850'
                      }`}
                    >
                      ₦{preset}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">Custom price: ₦</span>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    disabled={isSubmitting}
                    value={viewingPrice || ''}
                    onChange={(e) => setViewingPrice(Math.max(10, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {isSubmitting && (
            <div className="p-3 bg-neutral-950 rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>{uploadStage || 'Uploading video...'}</span>
                </span>
                <span className="text-amber-300 font-mono font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              id="btn-submit-upload"
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950/20 border-t-neutral-950 rounded-full animate-spin" />
                  <span>Publishing to Feed...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Video</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
