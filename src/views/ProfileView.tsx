import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Edit3,
  Heart,
  Users,
  Video,
  Shield,
  Save,
  X,
  Play,
  Share2,
  Check,
  Mail,
  Key,
  Wallet,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Video as VideoType, User } from '../types.ts';
import { StorageExplorer } from '../components/StorageExplorer.tsx';

interface ProfileViewProps {
  targetUsername?: string | null;
  onBackToFeed: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenAdmin?: () => void;
  onOpenWallet?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  targetUsername,
  onBackToFeed,
  onSelectVideo,
  onOpenAdmin,
  onOpenWallet,
}) => {
  const { user: currentUser, logout, isAdmin, refreshUser, openAuthModal } = useAuth();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [userVideos, setUserVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [bioInput, setBioInput] = useState<string>('');
  const [avatarInput, setAvatarInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'videos' | 'storage'>('videos');

  const isOwnProfile = !targetUsername || (currentUser && currentUser.username === targetUsername);

  const loadProfile = async () => {
    if (!targetUsername && !currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const identifier = targetUsername || currentUser?.username || 'mrfelix_admin';
      const data = await api.getUserProfile(identifier);
      setProfileUser(data);
      setUserVideos(data.videos || []);
      setIsFollowing(data.isFollowing || false);
      setFollowersCount(data.followersCount || 0);

      setBioInput(data.bio || '');
      setAvatarInput(data.avatarUrl || '');
      setUsernameInput(data.username || '');
    } catch {
      setProfileUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetUsername, currentUser]);

  const handleToggleFollow = async () => {
    if (!profileUser) return;
    try {
      const res = await api.toggleFollow(profileUser.id);
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.followersCount);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        bio: bioInput.trim(),
        avatarUrl: avatarInput.trim(),
        username: usernameInput.trim(),
      });
      setProfileUser((prev: any) => ({ ...prev, ...updated }));
      setIsEditing(false);
      refreshUser();
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this video from storage and feed?')) {
      return;
    }
    try {
      await api.deleteVideo(videoId);
      setUserVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err: any) {
      console.error('Delete video error:', err);
      alert(err.message || 'Failed to delete video.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-neutral-950">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  if (!targetUsername && !currentUser) {
    return (
      <div
        id="profile-guest-container"
        className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto animate-in fade-in"
      >
        <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-5 text-neutral-400 shadow-xl shadow-black/40">
          <UserIcon className="w-10 h-10 text-neutral-400" />
        </div>
        <h2 className="text-xl font-bold text-neutral-100 mb-2">Your Mr Felix Channel</h2>
        <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
          Sign in or create an account to view and customize your profile, track your uploaded videos, and connect with other creators.
        </p>
        <button
          onClick={() => openAuthModal('login', 'Sign in to access your Mr Felix channel')}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 mb-3 active:scale-[0.98]"
        >
          Sign In / Create Account
        </button>
        <button
          onClick={onBackToFeed}
          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-neutral-400">
        <p className="text-xs mb-3">User profile could not be found.</p>
        <button
          onClick={onBackToFeed}
          className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div
      id="profile-page-container"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-4 max-w-2xl mx-auto text-neutral-100 animate-in fade-in"
    >
      {/* Top Banner / Avatar Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-3">
          <img
            src={profileUser.avatarUrl}
            alt={profileUser.username}
            className="w-24 h-24 rounded-full object-cover border-4 border-amber-400/80 shadow-2xl bg-neutral-900"
          />
          {profileUser.role === 'admin' && (
            <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-neutral-950 shadow">
              <Shield className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <h2 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
          @{profileUser.username}
          {profileUser.role === 'admin' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
              Admin
            </span>
          )}
        </h2>

        {/* Email display for own account */}
        {isOwnProfile && (currentUser?.email || profileUser.email) && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1 font-mono bg-neutral-900/80 px-2.5 py-1 rounded-full border border-neutral-800/80">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentUser?.email || profileUser.email}</span>
          </div>
        )}

        <p className="text-xs text-neutral-300 max-w-sm mt-2 leading-relaxed">
          {profileUser.bio || 'Creator on Mr Felix. Crafting short-form stories.'}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mt-4 py-2 px-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs">
          <div>
            <span className="font-bold text-base text-white block">{followersCount}</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Followers</span>
          </div>
          <div className="w-px h-6 bg-neutral-800" />
          <div>
            <span className="font-bold text-base text-white block">{profileUser.followingCount || 0}</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Following</span>
          </div>
          <div className="w-px h-6 bg-neutral-800" />
          <div>
            <span className="font-bold text-base text-amber-400 block">{profileUser.totalLikes || 0}</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Likes</span>
          </div>
        </div>

        {/* Profile Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {isOwnProfile ? (
            <>
              {currentUser?.email?.toLowerCase() === 'nworkaebube@gmail.com' && onOpenAdmin && (
                <button
                  id="btn-profile-admin"
                  onClick={onOpenAdmin}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-500/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </button>
              )}

              <button
                id="btn-edit-profile"
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                id="btn-logout"
                onClick={logout}
                className="px-4 py-1.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 hover:bg-red-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleToggleFollow}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                isFollowing
                  ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow Creator'}
            </button>
          )}
        </div>

        {/* Wallet Balance & Deposit/Withdraw Quick Access */}
        {isOwnProfile && (
          <div
            id="profile-wallet-banner"
            className="mt-5 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-left shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Wallet Balance
                </span>
                <span className="text-lg font-black text-white font-mono">
                  ₦{(currentUser?.walletBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {onOpenWallet && (
              <button
                id="btn-profile-wallet-action"
                onClick={onOpenWallet}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet Dashboard</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Tabs: Videos vs Storage */}
      <div className="border-t border-neutral-800 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'videos'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Published Videos ({userVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'storage'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>Storage {isOwnProfile ? 'Drive' : 'Items'}</span>
            </button>
          </div>
        </div>

        {activeTab === 'storage' ? (
          <div className="pt-2">
            <StorageExplorer
              targetUserId={profileUser.id}
              creatorName={profileUser.username}
            />
          </div>
        ) : (
          <div>
            {userVideos.length === 0 ? (
              <div className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
                No published videos found for this account.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onSelectVideo(video.id)}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/80 cursor-pointer group shadow-sm"
                  >
                    <img
                      src={video.posterUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      {(isOwnProfile || isAdmin) && (
                        <button
                          onClick={(e) => handleDeleteVideo(video.id, e)}
                          title="Permanently delete video"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white shadow-md transition-transform hover:scale-110 active:scale-95 z-10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-semibold text-white line-clamp-2">{video.title}</span>
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                        <Heart className="w-3 h-3 fill-current" />
                        <span>{video.likesCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">Edit Your Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
