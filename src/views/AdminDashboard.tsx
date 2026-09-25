import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Video,
  Zap,
  Radio,
  Link,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Ban,
  Save,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Database,
  Key,
  Sparkles,
  LogIn,
  ArrowRight,
  UserCheck,
  Wallet,
  Image as ImageIcon,
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from 'lucide-react';

import { api } from '../lib/api.ts';
import {
  AdminOverview,
  User,
  Video as VideoType,
  DataPurchase,
  LiveStream,
  RequiredLink,
  WalletTransaction,
} from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

type AdminSection =
  | 'overview'
  | 'wallet'
  | 'users'
  | 'videos'
  | 'data-requests'
  | 'live-streams'
  | 'required-link'
  | 'settings'
  | 'status';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, adminLogin, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [videosList, setVideosList] = useState<VideoType[]>([]);
  const [dataRequests, setDataRequests] = useState<DataPurchase[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [requiredLink, setRequiredLink] = useState<RequiredLink | null>(null);
  const [settings, setSettings] = useState<{
    siteTitle: string;
    maintenanceMode: boolean;
    dailyDataPrice: string;
    announcementText: string;
  }>({
    siteTitle: 'Mr Felix',
    maintenanceMode: false,
    dailyDataPrice: '₦250',
    announcementText: '',
  });

  const [statusOnline, setStatusOnline] = useState<boolean>(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    databaseProvider: string;
    hasServiceRoleKey: boolean;
    message: string;
  } | null>(null);

  // Wallet Management State
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletFilter, setWalletFilter] = useState<'all' | 'pending' | 'deposit' | 'withdrawal'>('pending');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Manual Balance Adjustment state
  const [adjUserId, setAdjUserId] = useState<string>('');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState<boolean>(false);

  // Authentication State for Admin Entry (Restricted to nworkaebube@gmail.com)
  const [adminEmail, setAdminEmail] = useState('nworkaebube@gmail.com');
  const [adminPass, setAdminPass] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass) {
      setAuthError('Please enter the administrator password.');
      return;
    }
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await adminLogin(adminPass);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect administrator password or unauthorized email.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Send admin heartbeat immediately and every 15s to keep online status active
  useEffect(() => {
    if (isAdmin) {
      api.sendAdminHeartbeat().catch(() => {});
      const hb = setInterval(() => {
        api.sendAdminHeartbeat().catch(() => {});
      }, 15000);
      return () => clearInterval(hb);
    }
  }, [isAdmin]);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [ov, users, vids, reqs, streams, linkConfig, setts, status, sb, txs] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminVideos(),
        api.getAdminDataRequests(),
        api.getAdminLiveStreams(),
        api.getAdminRequiredLink(),
        api.getAdminSettings(),
        api.getAdminStatus(),
        api.getSupabaseStatus().catch(() => null),
        api.getAdminWalletTransactions().catch(() => []),
      ]);

      setOverview(ov);
      setUsersList(users);
      setVideosList(vids);
      setDataRequests(reqs);
      setLiveStreams(streams);
      setRequiredLink(linkConfig);
      setSettings(setts);
      setStatusOnline(status.isOnline);
      if (sb) setSupabaseStatus(sb);
      if (txs) setWalletTransactions(txs);
    } catch (err: any) {

      setActionError(err.message || 'Failed to load admin telemetry data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    const isCurrentUserAdminEmail = user?.email?.toLowerCase() === 'nworkaebube@gmail.com';

    return (
      <div className="min-h-[calc(100vh-4rem)] pb-24 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Lock Icon & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-inner relative">
              <Shield className="w-8 h-8" />
              <Lock className="w-4 h-4 absolute bottom-2 right-2 text-amber-300" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Panel Locked</h1>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Access is strictly restricted to the authorized administrator account:
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950 border border-amber-500/30 text-amber-400 font-mono text-xs font-semibold">
              <Key className="w-3.5 h-3.5" />
              <span>nworkaebube@gmail.com</span>
            </div>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Account status note */}
          {user && !isCurrentUserAdminEmail && (
            <div className="mb-5 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Current Session:</span>
                <span className="font-semibold text-white truncate max-w-[180px]">{user.email}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                You are currently signed in with a standard account. Enter the master admin password below to switch to the administrator account, or log out.
              </p>
              <button
                type="button"
                id="btn-admin-switch-account"
                onClick={logout}
                className="w-full py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              >
                Log Out Current Account
              </button>
            </div>
          )}

          {/* Password Unlock Form */}
          <form onSubmit={handleAdminUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Master Administrator Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="input-admin-password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter administrator password"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-unlock-admin-panel"
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Master Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center">
            <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500/60" />
              <span>Protected by master key authentication & session encryption</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Action handlers
  const handleToggleBan = async (targetUserId: string) => {
    try {
      const res = await api.toggleUserBan(targetUserId);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isBanned: res.isBanned } : u))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle ban.');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to permanently delete this video?')) return;
    try {
      await api.deleteAdminVideo(videoId);
      setVideosList((prev) => prev.filter((v) => v.id !== videoId));
      if (overview) {
        setOverview({ ...overview, totalVideos: Math.max(0, overview.totalVideos - 1) });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete video.');
    }
  };

  const handleUpdateDataRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const notes = prompt(`Enter optional note for ${status} status:`, status === 'APPROVED' ? 'Bundle assigned' : 'Verification declined');
      const updated = await api.updateDataRequestStatus(id, status, notes || undefined);
      setDataRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update data request.');
    }
  };

  const handleToggleStream = async (streamId: string) => {
    try {
      const updated = await api.toggleAdminLiveStream(streamId);
      setLiveStreams((prev) => prev.map((s) => (s.id === streamId ? updated : s)));
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle stream.');
    }
  };

  const handleSaveRequiredLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredLink) return;
    try {
      const updated = await api.updateAdminRequiredLink(requiredLink);
      setRequiredLink(updated);
      setSaveSuccessMessage('Required Link configuration saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save link configuration.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateAdminSettings(settings);
      setSettings(updated);
      setSaveSuccessMessage('System settings saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save settings.');
    }
  };

  const handleActionWalletTx = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const promptText = action === 'APPROVE'
        ? 'Enter optional approval note (e.g. PalmPay deposit confirmed):'
        : 'Enter reason for rejection (e.g. Invalid transfer screenshot or mismatch):';
      const notes = prompt(promptText, action === 'APPROVE' ? 'PalmPay transfer verified' : 'Could not verify transfer');
      const res = await api.actionWalletTransaction(id, action, notes || undefined);

      setWalletTransactions((prev) => prev.map((t) => (t.id === id ? res.transaction : t)));
      setSaveSuccessMessage(`Transaction marked as ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'}. User has been notified.`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);

      // Refresh users to reflect balance adjustments
      const updatedUsers = await api.getAdminUsers().catch(() => null);
      if (updatedUsers) setUsersList(updatedUsers);
    } catch (err: any) {
      setActionError(err.message || 'Failed to process transaction.');
    }
  };

  const handleApplyBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjUserId) {
      setActionError('Please select a user to adjust balance for.');
      return;
    }
    const num = parseFloat(adjAmount);
    if (isNaN(num) || num === 0) {
      setActionError('Please enter a valid non-zero amount (positive to credit, negative to debit).');
      return;
    }

    setIsAdjustingBalance(true);
    try {
      const res = await api.adjustUserWalletBalance(adjUserId, num, adjReason || undefined);
      setSaveSuccessMessage(res.message || 'User balance updated successfully.');
      setAdjAmount('');
      setAdjReason('');
      setTimeout(() => setSaveSuccessMessage(null), 3500);

      // Refresh
      const [updatedUsers, updatedTxs] = await Promise.all([
        api.getAdminUsers().catch(() => null),
        api.getAdminWalletTransactions().catch(() => null),
      ]);
      if (updatedUsers) setUsersList(updatedUsers);
      if (updatedTxs) setWalletTransactions(updatedTxs);
    } catch (err: any) {
      setActionError(err.message || 'Failed to adjust balance.');
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  const pendingWalletCount = walletTransactions.filter((t) => t.status === 'PENDING').length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    {
      id: 'wallet',
      label: 'Wallet & Deposits',
      icon: Wallet,
      badge: pendingWalletCount,
    },
    { id: 'users', label: 'Users', icon: Users, badge: usersList.length },
    { id: 'videos', label: 'Videos', icon: Video, badge: videosList.length },
    {
      id: 'data-requests',
      label: 'Data Requests',
      icon: Zap,
      badge: dataRequests.filter((r) => r.status === 'PENDING').length,
    },
    { id: 'live-streams', label: 'Live Streams', icon: Radio, badge: liveStreams.length },
    { id: 'required-link', label: 'Required Link', icon: Link },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'status', label: 'Admin Status', icon: Shield },
  ];

  return (
    <div
      id="admin-dashboard-container"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-3 sm:px-6 max-w-6xl mx-auto text-neutral-100 animate-in fade-in"
    >
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 font-black flex items-center justify-center text-sm shadow">
              FX
            </div>
            <h1 className="text-xl font-black text-white font-['Outfit',sans-serif]">
              Mr Felix Admin Command Center
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Platform management, approvals, streams, and controls</p>
        </div>

        {/* Live Admin Online Status Badge as mandated */}
        <div className="flex items-center gap-2">
          <div
            id="admin-active-status-badge"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-xs font-bold shadow"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>🟢 Admin Online</span>
          </div>

          <button
            onClick={loadAllAdminData}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center gap-1.5"
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {saveSuccessMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex overflow-x-auto gap-1.5 pb-3 mb-6 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-neutral-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Website Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-base font-black text-white">{overview.siteStatus}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Total Users</span>
              <span className="text-2xl font-black text-white">{overview.totalUsers}</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Total Videos</span>
              <span className="text-2xl font-black text-amber-400">{overview.totalVideos}</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Data Requests</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{overview.totalDataRequests}</span>
                <span className="text-xs text-amber-400 font-bold">({overview.pendingDataRequests} pending)</span>
              </div>
            </div>
          </div>

          {/* Quick status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Pending Data Requests Quick Action
              </h3>
              {dataRequests.filter((r) => r.status === 'PENDING').length === 0 ? (
                <p className="text-xs text-neutral-500">No pending data purchase requests at the moment.</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {dataRequests
                    .filter((r) => r.status === 'PENDING')
                    .slice(0, 3)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">@{req.username}</span>
                          <span className="text-neutral-400 block text-[11px]">{req.phoneNumber}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateDataRequest(req.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateDataRequest(req.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                Required Link Quick Status
              </h3>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400">Enforcement Gate:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      requiredLink?.isEnabled
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {requiredLink?.isEnabled ? 'Active (Blocking)' : 'Disabled'}
                  </span>
                </div>
                <div className="truncate text-neutral-300 font-mono text-[11px]">
                  {requiredLink?.url || 'No URL configured'}
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Database Status */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Database & Backend Architecture</h3>
                  <p className="text-[11px] text-neutral-400">
                    Provider: <span className="text-white font-medium">{supabaseStatus?.databaseProvider || 'Checking...'}</span>
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                  supabaseStatus?.isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {supabaseStatus?.isConfigured ? '🟢 Supabase Active' : '🟡 Local Fallback (Ready for Supabase Keys)'}
              </span>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 space-y-2">
              <p className="leading-relaxed text-[12px]">
                {supabaseStatus?.message}
              </p>
              <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                <span>
                  📁 Schema file:{' '}
                  <code className="text-amber-300 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">
                    supabase-schema.sql
                  </code>
                </span>
                <span>
                  ⚙️ Config file:{' '}
                  <code className="text-amber-300 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">
                    src/lib/supabaseConfig.ts
                  </code>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: WALLET & FINANCIALS */}
      {activeSection === 'wallet' && (
        <div className="space-y-6">
          {/* 1. Metric Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Pending Requests
              </span>
              <div className="text-xl font-black text-amber-400">
                {pendingWalletCount}
              </div>
              <span className="text-[10px] text-neutral-500">Awaiting review</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Pending Volume
              </span>
              <div className="text-xl font-black text-white">
                ₦{walletTransactions
                  .filter((t) => t.status === 'PENDING')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </div>
              <span className="text-[10px] text-neutral-500">In verification</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Approved Deposits
              </span>
              <div className="text-xl font-black text-emerald-400">
                ₦{walletTransactions
                  .filter((t) => t.type === 'deposit' && t.status === 'APPROVED')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </div>
              <span className="text-[10px] text-neutral-500">Credited into wallets</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Approved Withdrawals
              </span>
              <div className="text-xl font-black text-neutral-200">
                ₦{walletTransactions
                  .filter((t) => t.type === 'withdrawal' && t.status === 'APPROVED')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </div>
              <span className="text-[10px] text-neutral-500">Processed out</span>
            </div>
          </div>

          {/* PalmPay Deposit Bank Details Banner */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-neutral-200 block">Configured PalmPay Receiving Account</span>
                <span className="text-neutral-400 text-[11px]">Users transfer funds to this account and upload proof:</span>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 font-mono text-xs">
              <div><span className="text-neutral-500">Bank:</span> <strong className="text-emerald-400">PalmPay</strong></div>
              <div><span className="text-neutral-500">Account:</span> <strong className="text-amber-400">907  658  6127</strong></div>
              <div><span className="text-neutral-500">Name:</span> <strong className="text-neutral-200">ALBERT TERKIMBI UKULA</strong></div>
            </div>
          </div>

          {/* Manual User Balance Adjustment Card */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Manual Wallet Balance Adjustment
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Directly credit or debit any registered user's wallet balance (e.g. promotional credits, refunds, adjustments).
            </p>
            <form onSubmit={handleApplyBalanceAdjustment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <select
                  value={adjUserId}
                  onChange={(e) => setAdjUserId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select User ({usersList.length})...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      @{u.username} ({u.email}) - Bal: ₦{(u.walletBalance || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <input
                  type="number"
                  step="100"
                  placeholder="Amount (e.g. 5000 or -1000)"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Reason / Note"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  disabled={isAdjustingBalance || !adjUserId || !adjAmount}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow"
                >
                  {isAdjustingBalance ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Apply Adjustment</span>
                </button>
              </div>
            </form>
          </div>

          {/* Transactions List with Filters */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                Wallet Transactions & Verification Requests ({walletTransactions.length})
              </h3>

              {/* Sub-filter chips */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                {(['pending', 'all', 'deposit', 'withdrawal'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWalletFilter(f)}
                    className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                      walletFilter === f
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f}
                    {f === 'pending' && pendingWalletCount > 0 && ` (${pendingWalletCount})`}
                  </button>
                ))}
              </div>
            </div>

            {walletTransactions.filter((tx) => {
              if (walletFilter === 'all') return true;
              if (walletFilter === 'pending') return tx.status === 'PENDING';
              if (walletFilter === 'deposit') return tx.type === 'deposit';
              if (walletFilter === 'withdrawal') return tx.type === 'withdrawal';
              return true;
            }).length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                No {walletFilter} wallet transactions found.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {walletTransactions
                  .filter((tx) => {
                    if (walletFilter === 'all') return true;
                    if (walletFilter === 'pending') return tx.status === 'PENDING';
                    if (walletFilter === 'deposit') return tx.type === 'deposit';
                    if (walletFilter === 'withdrawal') return tx.type === 'withdrawal';
                    return true;
                  })
                  .map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    const isPurchase = tx.type === 'purchase';
                    return (
                      <div
                        key={tx.id}
                        className="p-4 hover:bg-neutral-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] flex items-center gap-1 ${
                                isDeposit
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isPurchase
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {isDeposit ? (
                                <ArrowDownLeft className="w-3 h-3" />
                              ) : isPurchase ? (
                                <Zap className="w-3 h-3" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3" />
                              )}
                              {isPurchase ? 'Data Purchase' : tx.type}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                tx.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : tx.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {tx.status}
                            </span>

                            <span className="font-mono text-sm font-black text-white">
                              {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </span>

                            <span className="text-neutral-500 text-[11px]">
                              {new Date(tx.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-neutral-300 space-y-0.5">
                            <div>
                              User: <strong className="text-white">@{tx.username}</strong> ({tx.userEmail})
                            </div>
                            {isDeposit ? (
                              <div className="text-neutral-400">
                                Sender Name: <strong className="text-amber-300 text-xs font-bold">{tx.senderName || 'Not specified'}</strong>
                                {tx.bankName && <span className="ml-2">via {tx.bankName}</span>}
                              </div>
                            ) : isPurchase ? (
                              <div className="text-neutral-400">
                                Item: <strong className="text-amber-300 font-semibold">{tx.note || 'Data Bundle Purchase'}</strong>
                              </div>
                            ) : (
                              <div className="text-neutral-400">
                                Destination: <strong className="text-white">{tx.destinationBank}</strong> | Acct: <strong className="text-amber-300 font-mono">{tx.destinationAccountNumber}</strong> ({tx.destinationAccountName})
                              </div>
                            )}
                            {tx.note && <div className="text-[11px] text-neutral-400 italic">"{tx.note}"</div>}
                            {tx.adminNotes && <div className="text-[11px] text-neutral-400">Admin note: <span className="text-neutral-200">{tx.adminNotes}</span></div>}
                          </div>
                        </div>

                        {/* Actions & Proof Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {tx.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedProofUrl(tx.screenshotUrl || null)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-amber-400 font-bold text-xs transition-all"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          )}

                          {tx.status === 'PENDING' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleActionWalletTx(tx.id, 'APPROVE')}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActionWalletTx(tx.id, 'REJECT')}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs transition-all active:scale-95"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-neutral-500 text-[11px] font-mono">
                              Processed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: USERS */}
      {activeSection === 'users' && (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Registered Users ({usersList.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-800/40">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <img src={u.avatarUrl} alt={u.username} className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-bold text-white">@{u.username}</span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isBanned ? (
                        <span className="text-red-400 font-bold">Banned</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs ${
                            u.isBanned
                              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                              : 'bg-red-700 hover:bg-red-600 text-white'
                          }`}
                        >
                          {u.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: VIDEOS */}
      {activeSection === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Uploaded Video Content ({videosList.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videosList.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                    <img src={v.posterUrl} alt={v.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{v.title}</h4>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between mt-1">
                    <span>@{v.creatorUsername}</span>
                    <span>{v.likesCount} likes</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-800 flex justify-end">
                  <button
                    onClick={() => handleDeleteVideo(v.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-800 text-red-400 hover:bg-red-900 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: DATA REQUESTS */}
      {activeSection === 'data-requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Data Purchases & Telecom Approvals</h3>
              <p className="text-xs text-neutral-400">Review pending requests and update status to Approved or Rejected</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Bundle</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dataRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-bold text-white">@{req.username}</td>
                    <td className="py-3 px-4 text-neutral-300 font-mono">{req.phoneNumber}</td>
                    <td className="py-3 px-4 text-neutral-300">{req.packageName}</td>
                    <td className="py-3 px-4 font-bold text-amber-400">{req.price}</td>
                    <td className="py-3 px-4">
                      {req.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          APPROVED
                        </span>
                      ) : req.status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 text-[10px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-approve-${req.id}`}
                            onClick={() => handleUpdateDataRequest(req.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                          >
                            APPROVE
                          </button>
                          <button
                            id={`btn-reject-${req.id}`}
                            onClick={() => handleUpdateDataRequest(req.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs"
                          >
                            REJECT
                          </button>
                        </div>
                      )}
                      {req.status !== 'PENDING' && (
                        <span className="text-[11px] text-neutral-500 italic">Decided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: LIVE STREAMS */}
      {activeSection === 'live-streams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Live Stream Channels ({liveStreams.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {liveStreams.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">@{s.creatorUsername}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.isLive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {s.isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-neutral-200 mb-2 truncate">{s.title}</h4>
                <div className="text-[11px] text-neutral-400 mb-3 font-mono">
                  Viewers: {s.viewerCount} • Key: {s.streamKey}
                </div>
                <button
                  onClick={() => handleToggleStream(s.id)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                    s.isLive
                      ? 'bg-red-950 border border-red-800 text-red-300 hover:bg-red-900'
                      : 'bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                  }`}
                >
                  {s.isLive ? 'Terminate Stream' : 'Enable Stream'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: REQUIRED LINK FEATURE (As mandated in prompt) */}
      {activeSection === 'required-link' && requiredLink && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-left">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">Required Link Feature</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            When enabled, users must complete the configured destination link before continuing to use the platform.
            The URL and enabled state are persisted in the database.
          </p>

          <form onSubmit={handleSaveRequiredLink} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Destination URL</label>
              <input
                id="input-admin-required-url"
                type="url"
                required
                placeholder="https://example.com/partner-verification"
                value={requiredLink.url}
                onChange={(e) => setRequiredLink({ ...requiredLink, url: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Gate Title</label>
              <input
                type="text"
                value={requiredLink.title}
                onChange={(e) => setRequiredLink({ ...requiredLink, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Prompt Description</label>
              <textarea
                rows={2}
                value={requiredLink.description}
                onChange={(e) => setRequiredLink({ ...requiredLink, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Enable/Disable switch */}
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Required Link Enforcement</span>
                <span className="text-[11px] text-neutral-400">
                  {requiredLink.isEnabled ? 'Active: All visitors must complete' : 'Inactive: Normal browsing allowed'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="switch-required-link"
                  type="checkbox"
                  checked={requiredLink.isEnabled}
                  onChange={(e) => setRequiredLink({ ...requiredLink, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <button
              id="btn-save-required-link"
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Required Link Configuration</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 7: WEBSITE SETTINGS */}
      {activeSection === 'settings' && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-left">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">Website Settings</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Site Title</label>
              <input
                type="text"
                value={settings.siteTitle}
                onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Daily Data Price</label>
              <input
                type="text"
                value={settings.dailyDataPrice}
                onChange={(e) => setSettings({ ...settings, dailyDataPrice: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Announcement Banner</label>
              <textarea
                rows={2}
                placeholder="Optional announcement shown to all visitors..."
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Maintenance Mode</span>
                <span className="text-[11px] text-neutral-400">Put platform in read-only staging mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <button
              id="btn-save-settings"
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Settings</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 8: ADMIN STATUS */}
      {activeSection === 'status' && (
        <div className="max-w-lg mx-auto p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-600 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-900/30">
            <Shield className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
            Real-Time Telemetry
          </span>
          <h2 className="text-2xl font-black text-white font-['Outfit',sans-serif] mb-2">
            🟢 Admin Online
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed mb-6 max-w-sm mx-auto">
            The platform heartbeat detector confirms you are actively engaged on Mr Felix. This status is automatically
            broadcast to user feeds, buy-data pages, and headers across the network.
          </p>

          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Session:</span>
              <span className="text-white font-mono">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Heartbeat Frequency:</span>
              <span className="text-amber-400 font-mono">15 seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Inactivity Timeout:</span>
              <span className="text-neutral-300 font-mono">2 minutes</span>
            </div>
          </div>
        </div>
      )}

      {/* Proof Screenshot Lightbox Modal */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Payment Transfer Screenshot Proof</h3>
              </div>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-neutral-950">
              <img
                src={selectedProofUrl}
                alt="Payment proof"
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-neutral-800 shadow"
              />
            </div>
            <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex justify-end gap-2">
              <a
                href={selectedProofUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Size</span>
              </a>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
