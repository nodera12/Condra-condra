import React from 'react';
import { Home, Zap, Radio, Compass, PlusSquare, Bell, Shield, User as UserIcon, LogIn, LogOut, Mail, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type ActiveTab = 'home' | 'buy-data' | 'live' | 'explore' | 'wallet' | 'profile' | 'admin' | 'gmail';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenUpload: () => void;
  adminOnline: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenUpload,
  adminOnline,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const isDesignatedAdmin = user?.email?.toLowerCase() === 'nworkaebube@gmail.com';

  return (
    <>
      {/* Top Header Bar */}
      <header
        id="mrfelix-header"
        className="fixed top-0 left-0 right-0 z-40 h-14 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800/80 px-4 flex items-center justify-between transition-all"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-black tracking-tighter text-sm">
            FX
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-neutral-100 font-['Outfit',sans-serif] leading-tight flex items-center gap-1.5">
              Mr Felix
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            </span>
            <span className="text-[10px] text-neutral-400 tracking-wider uppercase font-medium">Video Network</span>
          </div>
        </div>

        {/* Status Indicator & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Live Status Badge */}
          <div
            id="admin-status-badge"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              adminOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${adminOnline ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
            <span>{adminOnline ? 'Admin Online' : 'Admin Offline'}</span>
          </div>

          {/* Upload Button */}
          <button
            id="btn-upload-video"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            title="Upload Video"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Post</span>
          </button>

          {/* Wallet button */}
          <button
            id="btn-header-wallet"
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeTab === 'wallet'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-amber-400 hover:text-amber-300'
            }`}
            title="Wallet (Deposit & Withdrawal)"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden xs:inline font-mono font-bold">
              {isAuthenticated && user?.walletBalance !== undefined
                ? `₦${user.walletBalance.toLocaleString()}`
                : 'Wallet'}
            </span>
          </button>

          {/* Gmail Workspace button */}
          <button
            id="btn-header-gmail"
            onClick={() => setActiveTab('gmail')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeTab === 'gmail'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm ring-1 ring-rose-500/30'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="Gmail Workspace"
          >
            <Mail className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Gmail</span>
          </button>

          {/* Admin Dashboard shortcut - EXCLUSIVELY SHOWN TO nworkaebube@gmail.com */}
          {isDesignatedAdmin && (
            <button
              id="btn-admin-portal"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-400 hover:bg-amber-900/50 hover:text-amber-300'
              }`}
              title="Admin Dashboard (Restricted to nworkaebube@gmail.com)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
              {adminOnline && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Notifications */}
          {isAuthenticated && (
            <button
              id="btn-notifications"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Direct Log Out */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-user-profile"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-1.5 p-1 rounded-full border transition-all ${
                  activeTab === 'profile' ? 'border-amber-400 ring-2 ring-amber-500/30' : 'border-neutral-800 hover:border-neutral-700'
                }`}
                title={`Logged in as @${user.username} (${user.email}) - View Profile`}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-7 h-7 rounded-full object-cover bg-neutral-800"
                />
              </button>
              <button
                id="btn-header-logout"
                onClick={logout}
                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 hover:text-red-300 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Bottom Navigation Bar */}
      <nav
        id="mrfelix-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-neutral-950/92 backdrop-blur-lg border-t border-neutral-800/80 px-2 flex items-center justify-around max-w-lg mx-auto sm:max-w-xl md:max-w-2xl"
      >
        {/* 1. HOME */}
        <button
          id="nav-btn-home"
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'home' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {activeTab === 'home' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">HOME</span>
        </button>

        {/* 2. BUY DATA */}
        <button
          id="nav-btn-buy-data"
          onClick={() => setActiveTab('buy-data')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'buy-data' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Zap className={`w-5 h-5 transition-transform ${activeTab === 'buy-data' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {activeTab === 'buy-data' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">BUY DATA</span>
        </button>

        {/* 3. WALLET */}
        <button
          id="nav-btn-wallet"
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'wallet' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'wallet' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {activeTab === 'wallet' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">WALLET</span>
        </button>

        {/* 4. LIVE */}
        <button
          id="nav-btn-live"
          onClick={() => setActiveTab('live')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'live' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Radio className={`w-5 h-5 transition-transform ${activeTab === 'live' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {activeTab === 'live' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">LIVE</span>
        </button>

        {/* 4. EXPLORE */}
        <button
          id="nav-btn-explore"
          onClick={() => setActiveTab('explore')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'explore' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform ${activeTab === 'explore' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {activeTab === 'explore' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">EXPLORE</span>
        </button>

        {/* 5. USER PROFILE */}
        <button
          id="nav-btn-profile"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
            activeTab === 'profile' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            {isAuthenticated && user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className={`w-5 h-5 rounded-full object-cover border ${
                  activeTab === 'profile' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-neutral-700'
                }`}
              />
            ) : (
              <UserIcon className={`w-5 h-5 transition-transform ${activeTab === 'profile' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
            )}
            {activeTab === 'profile' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-1">PROFILE</span>
        </button>

        {/* 6. ADMIN (SHOWN STRICTLY TO nworkaebube@gmail.com) */}
        {isDesignatedAdmin && (
          <button
            id="nav-btn-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all group ${
              activeTab === 'admin' ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Shield className={`w-5 h-5 transition-transform ${activeTab === 'admin' ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {activeTab === 'admin' && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-tight mt-1">ADMIN</span>
          </button>
        )}
      </nav>
    </>
  );
};
