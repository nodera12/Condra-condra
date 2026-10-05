import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  UserCheck,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Send,
  X,
  Check,
  Upload,
  Trash2,
  Gift,
  Lock,
  Unlock,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { Video, Comment, VideoGift } from '../types.ts';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface HomeFeedProps {
  initialVideoId?: string | null;
  onOpenProfile: (username: string) => void;
  onRefreshFeed: () => void;
  onOpenUpload?: () => void;
  onOpenWallet?: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  initialVideoId,
  onOpenProfile,
  onOpenUpload,
  onOpenWallet,
}) => {
  const { user, isAuthenticated, requireAuthAction, openAuthModal, refreshUser } = useAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState<boolean>(false);
  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Pay-to-watch / unlock state
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Video gift state
  const [giftModalOpen, setGiftModalOpen] = useState<boolean>(false);
  const [selectedGiftAmount, setSelectedGiftAmount] = useState<number>(100);
  const [isSendingGift, setIsSendingGift] = useState<boolean>(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSuccessToast, setGiftSuccessToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load videos on mount - newest first by default
  const loadVideos = async (shuffle = false) => {
    setIsLoading(true);
    try {
      const data = await api.getVideos(shuffle);
      setVideos(data.videos);
      if (initialVideoId) {
        const targetIdx = data.videos.findIndex((v) => v.id === initialVideoId);
        if (targetIdx !== -1) {
          setCurrentIndex(targetIdx);
          return;
        }
      }
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideos(false);
  }, []);

  const currentVideo = videos[currentIndex];

  // Auto-play / pause when current video changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback: mute and play
          setIsMuted(true);
          videoRef.current?.play().catch(() => {});
        });
      }
    }
  }, [currentIndex, isPlaying]);

  const handleNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop back to start smoothly
      setCurrentIndex(0);
    }
  };

  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentDrawerOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNextVideo();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrevVideo();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length, commentDrawerOpen]);

  // Touch Swipe gestures for mobile vertical scroll
  const touchStartY = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNextVideo();
      } else {
        handlePrevVideo();
      }
    }
  };

  // Wheel scrolling (debounced)
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 450) return;
    if (e.deltaY > 20) {
      lastWheelTime.current = now;
      handleNextVideo();
    } else if (e.deltaY < -20) {
      lastWheelTime.current = now;
      handlePrevVideo();
    }
  };

  // Like video
  const handleLike = () => {
    if (!currentVideo) return;
    requireAuthAction(async () => {
      try {
        const res = await api.toggleLike(currentVideo.id);
        setVideos((prev) =>
          prev.map((v) => (v.id === currentVideo.id ? { ...v, isLiked: res.isLiked, likesCount: res.likesCount } : v))
        );
      } catch (err) {
        console.error('Like error:', err);
      }
    }, 'Please log in or create an account to like videos.');
  };

  // Follow creator
  const handleFollow = () => {
    if (!currentVideo) return;
    requireAuthAction(async () => {
      try {
        const res = await api.toggleFollow(currentVideo.creatorId);
        setVideos((prev) =>
          prev.map((v) =>
            v.creatorId === currentVideo.creatorId ? { ...v, isFollowing: res.isFollowing } : v
          )
        );
      } catch (err) {
        console.error('Follow error:', err);
      }
    }, 'Please log in or create an account to follow creators.');
  };

  // Open comments
  const handleOpenComments = async () => {
    if (!currentVideo) return;
    setCommentDrawerOpen(true);
    try {
      const comments = await api.getComments(currentVideo.id);
      setActiveComments(comments);
    } catch (err) {
      console.error('Comments error:', err);
    }
  };

  // Submit comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentVideo) return;

    requireAuthAction(async () => {
      setIsSubmittingComment(true);
      try {
        const comment = await api.postComment(currentVideo.id, newCommentText.trim());
        setActiveComments((prev) => [comment, ...prev]);
        setNewCommentText('');
        setVideos((prev) =>
          prev.map((v) => (v.id === currentVideo.id ? { ...v, commentsCount: (v.commentsCount || 0) + 1 } : v))
        );
      } catch (err) {
        console.error('Post comment error:', err);
      } finally {
        setIsSubmittingComment(false);
      }
    }, 'Please log in or create an account to comment on videos.');
  };

  // Share
  const handleShare = async () => {
    if (!currentVideo) return;
    try {
      await api.shareVideo(currentVideo.id);
      setVideos((prev) =>
        prev.map((v) => (v.id === currentVideo.id ? { ...v, sharesCount: (v.sharesCount || 0) + 1 } : v))
      );
      if (navigator.share) {
        await navigator.share({
          title: currentVideo.title,
          text: `Watch "${currentVideo.title}" by @${currentVideo.creatorUsername} on Mr Felix!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast('Video link copied to clipboard!');
        setTimeout(() => setShareToast(null), 3000);
      }
    } catch (err) {
      // User cancelled share or copy
    }
  };

  // Delete video (Owner or Admin)
  const handleDeleteVideo = async () => {
    if (!currentVideo) return;
    if (!window.confirm(`Permanently delete "${currentVideo.title}" from storage and database?`)) {
      return;
    }
    try {
      await api.deleteVideo(currentVideo.id);
      setVideos((prev) => {
        const nextList = prev.filter((v) => v.id !== currentVideo.id);
        if (currentIndex >= nextList.length && nextList.length > 0) {
          setCurrentIndex(nextList.length - 1);
        }
        return nextList;
      });
      setShareToast('Video permanently deleted.');
      setTimeout(() => setShareToast(null), 2500);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete video.');
    }
  };

  // Pay to Watch / Unlock Video
  const handleUnlockVideo = async () => {
    if (!currentVideo) return;
    if (!isAuthenticated) {
      openAuthModal('login', 'Please log in or create an account to unlock this video.');
      return;
    }

    const price = currentVideo.viewingPrice || 100;
    if ((user?.walletBalance || 0) < price) {
      setUnlockError(`Insufficient balance (₦${(user?.walletBalance || 0).toLocaleString()}). Please deposit to watch.`);
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const res = await api.payToWatchVideo(currentVideo.id);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === currentVideo.id
            ? { ...v, isLocked: false, hasPaid: true, videoUrl: res.videoUrl }
            : v
        )
      );
      await refreshUser();
      setIsPlaying(true);
      setShareToast(`🎉 Unlocked "${currentVideo.title}"! Enjoy watching.`);
      setTimeout(() => setShareToast(null), 3500);
    } catch (err: any) {
      console.error('Unlock error:', err);
      setUnlockError(err.message || 'Failed to unlock video.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Send Gift to Creator
  const handleSendGift = async () => {
    if (!currentVideo) return;
    if (!isAuthenticated) {
      openAuthModal('login', 'Please log in to send gifts to creators.');
      return;
    }

    if (user?.id === currentVideo.creatorId || user?.id === currentVideo.userId) {
      setGiftError('You cannot send a gift to your own video.');
      return;
    }

    if ((user?.walletBalance || 0) < selectedGiftAmount) {
      setGiftError(
        `Insufficient balance (₦${(user?.walletBalance || 0).toLocaleString()}). Please deposit at least ₦${selectedGiftAmount} to send this gift.`
      );
      return;
    }

    setIsSendingGift(true);
    setGiftError(null);
    try {
      const res = await api.sendVideoGift(currentVideo.id, selectedGiftAmount);
      await refreshUser();
      setGiftModalOpen(false);
      setGiftSuccessToast(res.message || `🎁 Gift of ₦${selectedGiftAmount.toLocaleString()} sent to @${currentVideo.creatorUsername}!`);
      setTimeout(() => setGiftSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Gift error:', err);
      setGiftError(err.message || 'Failed to send gift.');
    } finally {
      setIsSendingGift(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] pb-16 flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Loading Mr Felix Feed...</span>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] pb-16 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 font-['Outfit',sans-serif]">
          No videos yet. Be the first to upload a video.
        </h3>
        <p className="text-xs max-w-xs mb-6 text-neutral-400 leading-relaxed">
          Upload and share your short video from your phone, tablet, or computer. Real videos will appear here instantly.
        </p>
        <div className="flex items-center gap-3">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          )}
          <button
            onClick={() => loadVideos(false)}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center gap-2 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="home-video-stage-container"
      className="relative w-full h-[calc(100vh-3.5rem)] pb-16 flex items-center justify-center bg-neutral-950 select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Central Immersive Video Frame (Mobile: 100%, Tablet/Desktop: Framed Cinema Stage) */}
      <div
        id="video-viewport-frame"
        className="relative w-full h-full max-w-md bg-black md:rounded-2xl md:my-2 md:h-[calc(100%-1rem)] overflow-hidden shadow-2xl border border-neutral-900 flex items-center justify-center"
      >
        {/* Actual Video Player */}
        {!currentVideo.isLocked ? (
          <video
            ref={videoRef}
            id="active-video-element"
            src={currentVideo.videoUrl}
            poster={currentVideo.posterUrl}
            playsInline
            loop
            muted={isMuted}
            onClick={() => setIsPlaying((prev) => !prev)}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
            {currentVideo.posterUrl && (
              <img
                src={currentVideo.posterUrl}
                alt={currentVideo.title}
                className="w-full h-full object-cover blur-md brightness-50"
              />
            )}
            {/* Paywall Overlay */}
            <div
              id="paywall-overlay"
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-6 text-center select-text"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-xl shadow-amber-500/10">
                <Lock className="w-8 h-8" />
              </div>

              <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                Private Creator Content
              </div>

              <h3 className="text-base font-bold text-white mb-1 line-clamp-2 px-2">
                {currentVideo.title}
              </h3>

              <p className="text-xs text-neutral-400 max-w-xs mb-4 leading-relaxed">
                Exclusive video by <span className="text-amber-400 font-semibold">@{currentVideo.creatorUsername}</span>. Pay to unlock full streaming access.
              </p>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 w-full max-w-xs mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-neutral-400">Unlock Fee:</span>
                  <span className="text-amber-400 font-black text-sm">₦{(currentVideo.viewingPrice || 100).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800">
                  <span className="text-neutral-400">Your Wallet:</span>
                  <span className="text-white font-mono font-bold">₦{(user?.walletBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              {unlockError && (
                <div className="mb-3 p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-[11px] max-w-xs flex items-center gap-1.5 text-left">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              {user ? (
                (user.walletBalance || 0) >= (currentVideo.viewingPrice || 100) ? (
                  <button
                    id="btn-unlock-video"
                    onClick={handleUnlockVideo}
                    disabled={isUnlocking}
                    className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                  >
                    {isUnlocking ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                        <span>Unlocking Video...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlock & Watch (₦{(currentVideo.viewingPrice || 100).toLocaleString()})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full max-w-xs space-y-2">
                    <p className="text-[11px] text-amber-400 font-medium">
                      Insufficient wallet balance to unlock this video.
                    </p>
                    {onOpenWallet && (
                      <button
                        id="btn-deposit-for-unlock"
                        onClick={onOpenWallet}
                        className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-colors"
                      >
                        Go to Wallet & Deposit
                      </button>
                    )}
                  </div>
                )
              ) : (
                <button
                  id="btn-login-to-unlock"
                  onClick={() => openAuthModal('login', 'Please log in to unlock and watch private videos.')}
                  className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                >
                  Log In to Unlock
                </button>
              )}
            </div>
          </div>
        )}

        {/* Play/Pause Center Indicator */}
        {!currentVideo.isLocked && !isPlaying && (
          <div
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-neutral-950/70 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-xl animate-scale-up">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Top Controls Overlay: Sound mute, Refresh feed, Video index counter */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
          {/* Audio toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => setIsMuted((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white text-xs font-medium hover:bg-black/80 transition-colors shadow"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-[11px]">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Intelligent Shuffle Refresh Button */}
          <button
            id="btn-shuffle-feed"
            onClick={() => loadVideos(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white text-xs font-medium hover:bg-black/80 transition-colors shadow"
            title="Randomize & Refresh Feed"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Shuffle Feed</span>
          </button>
        </div>

        {/* Desktop / Tablet Vertical Navigation Arrows */}
        <div className="hidden sm:flex absolute right-3 top-16 flex-col gap-2 z-20">
          <button
            id="btn-prev-video"
            onClick={handlePrevVideo}
            disabled={currentIndex === 0}
            className="p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white disabled:opacity-30 transition-all shadow"
            title="Previous video (Up arrow)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            id="btn-next-video"
            onClick={handleNextVideo}
            className="p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white transition-all shadow"
            title="Next video (Down arrow)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Right Floating Interaction Bar (Original sleek design) */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4.5">
          {/* Creator Profile Avatar + Follow Tag */}
          <div className="relative group flex flex-col items-center">
            <div
              onClick={() => {
                requireAuthAction(() => onOpenProfile(currentVideo.creatorUsername), 'Please log in to view creator profiles.');
              }}
              className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5 cursor-pointer shadow-lg bg-neutral-900 transition-transform active:scale-95"
            >
              <img
                src={currentVideo.creatorAvatar}
                alt={currentVideo.creatorUsername}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {/* Follow button pill */}
            <button
              id="btn-follow-creator"
              onClick={handleFollow}
              className={`-mt-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 transition-all ${
                currentVideo.isFollowing
                  ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black ring-2 ring-neutral-950'
              }`}
            >
              {currentVideo.isFollowing ? (
                <>
                  <UserCheck className="w-2.5 h-2.5" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-2.5 h-2.5" />
                  <span>Follow</span>
                </>
              )}
            </button>
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              id="btn-like-video"
              onClick={handleLike}
              className={`p-3 rounded-full backdrop-blur-md border shadow-lg transition-transform active:scale-125 ${
                currentVideo.isLiked
                  ? 'bg-red-500/20 border-red-500/40 text-red-500'
                  : 'bg-black/50 hover:bg-black/70 border-white/10 text-white'
              }`}
            >
              <Heart className={`w-6 h-6 ${currentVideo.isLiked ? 'fill-current' : ''}`} />
            </button>
            <span className="text-[11px] font-bold text-white drop-shadow mt-1">
              {currentVideo.likesCount}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              id="btn-comment-video"
              onClick={handleOpenComments}
              className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white shadow-lg transition-transform active:scale-125"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-bold text-white drop-shadow mt-1">
              {currentVideo.commentsCount}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              id="btn-share-video"
              onClick={handleShare}
              className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white shadow-lg transition-transform active:scale-125"
            >
              <Share2 className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-bold text-white drop-shadow mt-1">
              {currentVideo.sharesCount}
            </span>
          </div>

          {/* Gift Creator Button */}
          <div className="flex flex-col items-center">
            <button
              id="btn-gift-video"
              onClick={() => {
                requireAuthAction(() => {
                  setGiftError(null);
                  setGiftModalOpen(true);
                }, 'Please log in to send gifts to creators.');
              }}
              className="p-3 rounded-full bg-gradient-to-tr from-amber-500/25 via-amber-400/20 to-yellow-500/25 hover:from-amber-500/40 hover:to-yellow-500/40 backdrop-blur-md border border-amber-400/50 text-amber-300 shadow-lg shadow-amber-500/10 transition-transform active:scale-125"
              title="Send Gift to Creator"
            >
              <Gift className="w-6 h-6 animate-pulse" />
            </button>
            <span className="text-[11px] font-bold text-amber-300 drop-shadow mt-1">
              Gift
            </span>
          </div>

          {/* Delete Button (Visible only to the video's owner or platform Admin) */}
          {(user?.id === currentVideo.creatorId || user?.id === currentVideo.userId || user?.role === 'admin') && (
            <div className="flex flex-col items-center">
              <button
                id="btn-delete-video"
                onClick={handleDeleteVideo}
                title="Delete this video"
                className="p-3 rounded-full bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 hover:text-white shadow-lg transition-transform active:scale-125"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-medium text-red-400 drop-shadow mt-1">
                Delete
              </span>
            </div>
          )}

          {/* Audio Disc Visualizer */}
          <div className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center shadow-lg relative overflow-hidden animate-spin-slow">
            <Music className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Bottom Left Video Metadata (Creator info, description, music, tags) */}
        <div className="absolute left-3 right-20 bottom-3 z-20 pointer-events-auto text-left">
          {/* Creator badge */}
          <div
            onClick={() => {
              requireAuthAction(() => onOpenProfile(currentVideo.creatorUsername), 'Please log in to view creator profiles.');
            }}
            className="flex items-center gap-2 cursor-pointer mb-1.5"
          >
            <span className="text-sm font-bold text-white drop-shadow hover:text-amber-400 transition-colors">
              @{currentVideo.creatorUsername}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300">
              Creator
            </span>
          </div>

          {/* Title & Description */}
          <h4 className="text-sm font-semibold text-white leading-tight mb-1 drop-shadow line-clamp-1">
            {currentVideo.title}
          </h4>
          <p className="text-xs text-neutral-200/90 leading-snug drop-shadow line-clamp-2 mb-2 font-normal">
            {currentVideo.description}
          </p>

          {/* Audio Information Ticker */}
          <div className="flex items-center gap-1.5 text-xs text-amber-300/90 drop-shadow">
            <Music className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] font-medium">{currentVideo.musicTitle}</span>
          </div>

          {/* Tags */}
          {currentVideo.tags && currentVideo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentVideo.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[10px] font-medium text-neutral-300 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Linear Progress Bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-neutral-900 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Comments Drawer Modal */}
      {commentDrawerOpen && (
        <div
          id="comments-drawer-backdrop"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setCommentDrawerOpen(false)}
        >
          <div
            id="comments-drawer-content"
            className="w-full max-w-md bg-neutral-900 border-t border-neutral-800 rounded-t-3xl max-h-[75vh] h-[75vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-sm font-bold text-white font-['Outfit',sans-serif]">
                Comments ({activeComments.length})
              </span>
              <button
                onClick={() => setCommentDrawerOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {activeComments.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  No comments yet. Be the first to start the conversation!
                </div>
              ) : (
                activeComments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2.5 text-left">
                    <img
                      src={comment.userAvatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full object-cover bg-neutral-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-neutral-200">@{comment.username}</span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed break-words">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-neutral-800 flex items-center gap-2">
              <input
                id="input-new-comment"
                type="text"
                placeholder={isAuthenticated ? 'Add a comment...' : 'Log in to comment...'}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                id="btn-submit-comment"
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Gift Success Toast */}
      {giftSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-neutral-950 text-xs font-black shadow-2xl flex items-center gap-2 animate-in zoom-in-95">
          <Gift className="w-4 h-4 fill-neutral-950" />
          <span>{giftSuccessToast}</span>
        </div>
      )}

      {/* Gift Creator Modal */}
      {giftModalOpen && currentVideo && (
        <div
          id="gift-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setGiftModalOpen(false)}
        >
          <div
            id="gift-modal-content"
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl text-left relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-['Outfit',sans-serif]">Send Creator Gift</h3>
                  <p className="text-[10px] text-neutral-400">Support @{currentVideo.creatorUsername}</p>
                </div>
              </div>
              <button
                onClick={() => setGiftModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="my-4 p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex items-center gap-3">
              <img
                src={currentVideo.creatorAvatar}
                alt={currentVideo.creatorUsername}
                className="w-10 h-10 rounded-full object-cover border border-amber-400/50"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">
                  @{currentVideo.creatorUsername}
                </span>
                <span className="text-[10px] text-neutral-400 truncate block">
                  "{currentVideo.title}"
                </span>
              </div>
            </div>

            {/* If user is the creator */}
            {user && (user.id === currentVideo.creatorId || user.id === currentVideo.userId) ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center my-3">
                <p className="font-semibold mb-1">This is your video!</p>
                <p className="text-[11px] text-amber-400/80">
                  Share this video with fans so they can send gifts directly to your Nigerian bank/wallet.
                </p>
              </div>
            ) : (
              <>
                {/* Gift Presets */}
                <div className="mb-4">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-2">
                    Select Gift Amount
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { amount: 50, label: '☕ Coffee', desc: 'Warm cheer' },
                      { amount: 100, label: '⭐ Super Star', desc: 'Popular' },
                      { amount: 150, label: '🔥 Fire Boost', desc: 'Huge fan' },
                      { amount: 200, label: '👑 Crown VIP', desc: 'Top supporter' },
                    ].map((item) => (
                      <button
                        key={item.amount}
                        type="button"
                        onClick={() => {
                          setSelectedGiftAmount(item.amount);
                          setGiftError(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedGiftAmount === item.amount
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold">{item.label}</span>
                          <span className="text-xs font-black text-amber-400">₦{item.amount}</span>
                        </div>
                        <span className="text-[9px] text-neutral-500 block">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Balance & Fee Summary */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 mb-4 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Your Wallet:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white">
                      ₦{(user?.walletBalance || 0).toLocaleString()}
                    </span>
                    {(user?.walletBalance || 0) < selectedGiftAmount && onOpenWallet && (
                      <button
                        type="button"
                        onClick={() => {
                          setGiftModalOpen(false);
                          onOpenWallet();
                        }}
                        className="text-[10px] text-amber-400 underline font-semibold ml-1"
                      >
                        Deposit
                      </button>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {giftError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="leading-tight">{giftError}</span>
                  </div>
                )}

                {/* Action button */}
                <button
                  id="btn-confirm-send-gift"
                  onClick={handleSendGift}
                  disabled={isSendingGift}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSendingGift ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                      <span>Sending Gift...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      <span>Send ₦{selectedGiftAmount.toLocaleString()} Gift</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
