import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navigation, ActiveTab } from './components/Navigation.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { RequiredLinkGate } from './components/RequiredLinkGate.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { VideoUploadModal } from './components/VideoUploadModal.tsx';
import { HomeFeed } from './views/HomeFeed.tsx';
import { BuyDataView } from './views/BuyDataView.tsx';
import { LiveView } from './views/LiveView.tsx';
import { ExploreView } from './views/ExploreView.tsx';
import { AdminDashboard } from './views/AdminDashboard.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { GmailView } from './views/GmailView.tsx';
import { WalletView } from './views/WalletView.tsx';
import { api } from './lib/api.ts';
import { AppNotification, Video } from './types.ts';

function MainAppContent() {
  const { user, isAuthenticated, isAdmin, openAuthModal } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Modals & Drawers
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminOnline, setAdminOnline] = useState<boolean>(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState<number>(0);

  // Sync hash routing if user opens with #live, #buy-data, #explore, #wallet, #admin, #gmail
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (['home', 'buy-data', 'live', 'explore', 'wallet', 'profile', 'admin', 'gmail'].includes(hash)) {
        setActiveTab(hash as ActiveTab);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
    if (tab === 'profile') {
      setViewedProfileUsername(null); // own profile
    }
  };

  // Poll Admin online status & notifications
  const pollStatus = useCallback(async () => {
    try {
      const status = await api.getAdminStatus();
      setAdminOnline(status.isOnline);
      if (isAuthenticated) {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      }
    } catch (err) {
      // Ignore network blips
    }
  }, [isAuthenticated]);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 8000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const handleOpenCreatorProfile = (username: string) => {
    setViewedProfileUsername(username);
    setActiveTab('profile');
    window.location.hash = `profile-${username}`;
  };

  const handleOpenUpload = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setIsUploadOpen(true);
  };

  const handleUploadSuccess = (newVideo: Video) => {
    setFeedRefreshKey((prev) => prev + 1);
    setActiveTab('home');
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Inter',sans-serif]">
      {/* Navigation Header & Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenUpload={handleOpenUpload}
        adminOnline={adminOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-14">
        {activeTab === 'home' && (
          <HomeFeed
            key={`${feedRefreshKey}-${selectedVideoId || 'default'}`}
            initialVideoId={selectedVideoId}
            onOpenProfile={handleOpenCreatorProfile}
            onRefreshFeed={pollStatus}
            onOpenUpload={handleOpenUpload}
            onOpenWallet={() => handleTabChange('wallet')}
          />
        )}

        {activeTab === 'buy-data' && (
          <BuyDataView
            adminOnline={adminOnline}
            onOpenWallet={() => handleTabChange('wallet')}
          />
        )}

        {activeTab === 'live' && (
          <LiveView />
        )}

        {activeTab === 'explore' && (
          <ExploreView />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            onBack={() => handleTabChange('home')}
            onOpenData={() => handleTabChange('buy-data')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            targetUsername={viewedProfileUsername}
            onBackToFeed={() => handleTabChange('home')}
            onSelectVideo={(videoId) => {
              setSelectedVideoId(videoId);
              handleTabChange('home');
            }}
            onOpenAdmin={() => handleTabChange('admin')}
            onOpenWallet={() => handleTabChange('wallet')}
          />
        )}

        {activeTab === 'gmail' && (
          <GmailView />
        )}
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onRefresh={pollStatus}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequiredLinkGate>
        <MainAppContent />
      </RequiredLinkGate>
    </AuthProvider>
  );
}
