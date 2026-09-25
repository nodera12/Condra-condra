import { User, Video, Comment, DataPackage, DataPurchase, LiveStream, LiveChatMessage, RequiredLink, SeasonalFilm, TypingScore, AppNotification, AdminOverview, WalletData, WalletTransaction, StorageItem, VideoGift } from '../types.ts';

const TOKEN_KEY = 'mrfelix_token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { email: string; username: string; password: string }) =>
    apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  googleAuth: (payload: { email: string; name?: string; googleId?: string; avatarUrl?: string }) =>
    apiRequest<{ token: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string; resetToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminLogin: (payload: { email?: string; password: string }) =>
    apiRequest<{ token: string; user: User }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  quickAdminLogin: (password?: string) =>
    apiRequest<{ token: string; user: User }>('/api/auth/quick-admin', {
      method: 'POST',
      body: JSON.stringify({ password: password || '080633Aa@' }),
    }),

  makeMeAdmin: (password?: string) =>
    apiRequest<{ token: string; user: User }>('/api/auth/make-me-admin', {
      method: 'POST',
      body: JSON.stringify({ password: password || '080633Aa@' }),
    }),

  getMe: () => apiRequest<User>('/api/auth/me'),

  updateProfile: (payload: { bio?: string; avatarUrl?: string; username?: string }) =>
    apiRequest<User>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Videos
  getVideos: (shuffle: boolean = false) =>
    apiRequest<{ videos: Video[]; total: number }>(`/api/videos${shuffle ? '?shuffle=true' : ''}`),

  uploadVideo: (payload: Partial<Video>) =>
    apiRequest<Video>('/api/videos/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadRawVideoFile: async (file: File): Promise<{ url: string; path: string; storagePath: string }> => {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/videos/upload-file', {
      method: 'POST',
      headers,
      body: file,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Upload failed with HTTP ${res.status}`);
    }

    return res.json();
  },

  toggleLike: (videoId: string) =>
    apiRequest<{ isLiked: boolean; likesCount: number }>(`/api/videos/${videoId}/like`, {
      method: 'POST',
    }),

  getComments: (videoId: string) =>
    apiRequest<Comment[]>(`/api/videos/${videoId}/comments`),

  postComment: (videoId: string, content: string) =>
    apiRequest<Comment>(`/api/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  shareVideo: (videoId: string) =>
    apiRequest<{ sharesCount: number }>(`/api/videos/${videoId}/share`, {
      method: 'POST',
    }),

  deleteVideo: (videoId: string) =>
    apiRequest<{ message: string; id: string }>(`/api/videos/${videoId}`, {
      method: 'DELETE',
    }),

  // User profiles & follow
  getUserProfile: (identifier: string) =>
    apiRequest<User & { isFollowing: boolean; totalLikes: number; videos: Video[] }>(`/api/users/${identifier}`),

  toggleFollow: (userId: string) =>
    apiRequest<{ isFollowing: boolean; followersCount: number }>(`/api/users/${userId}/follow`, {
      method: 'POST',
    }),

  // Buy Data
  getDataPackages: () =>
    apiRequest<DataPackage[]>('/api/data-packages'),

  createDataPurchase: (phoneNumber: string) =>
    apiRequest<{ message: string; purchase: DataPurchase; newBalance?: number }>('/api/data-purchases', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  getDataPurchasesHistory: () =>
    apiRequest<DataPurchase[]>('/api/data-purchases/history'),

  // Live Streams
  getLiveStreams: () =>
    apiRequest<LiveStream[]>('/api/live/streams'),

  getLiveStream: (id: string) =>
    apiRequest<LiveStream>(`/api/live/streams/${id}`),

  getLiveChat: (streamId: string) =>
    apiRequest<LiveChatMessage[]>(`/api/live/streams/${streamId}/chat`),

  postLiveChat: (streamId: string, message: string) =>
    apiRequest<LiveChatMessage>(`/api/live/streams/${streamId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  createLiveStream: (payload: { title: string; category?: string }) =>
    apiRequest<LiveStream>('/api/live/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Explore & Seasonal Films
  getSeasonalFilms: () =>
    apiRequest<SeasonalFilm[]>('/api/explore/seasonal-films'),

  // Typing Test
  saveTypingScore: (payload: Partial<TypingScore> & { guestName?: string }) =>
    apiRequest<TypingScore>('/api/typing-test/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTypingLeaderboard: () =>
    apiRequest<TypingScore[]>('/api/typing-test/leaderboard'),

  // Notifications
  getNotifications: () =>
    apiRequest<AppNotification[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    apiRequest<{ success: boolean }>('/api/notifications/read-all', {
      method: 'PUT',
    }),

  // Required Link & Admin Status
  getRequiredLink: () =>
    apiRequest<RequiredLink>('/api/required-link'),

  getAdminStatus: () =>
    apiRequest<{ isOnline: boolean; label: string; lastSeen: number }>('/api/admin/status'),

  sendAdminHeartbeat: () =>
    apiRequest<{ status: string }>('/api/admin/heartbeat', {
      method: 'POST',
    }),

  // Admin Dashboard API
  getAdminOverview: () =>
    apiRequest<AdminOverview>('/api/admin/overview'),

  getAdminUsers: () =>
    apiRequest<User[]>('/api/admin/users'),

  toggleUserBan: (userId: string) =>
    apiRequest<{ isBanned: boolean }>(`/api/admin/users/${userId}/ban`, {
      method: 'PUT',
    }),

  getAdminVideos: () =>
    apiRequest<Video[]>('/api/admin/videos'),

  deleteAdminVideo: (videoId: string) =>
    apiRequest<{ message: string }>(`/api/admin/videos/${videoId}`, {
      method: 'DELETE',
    }),

  getAdminDataRequests: () =>
    apiRequest<DataPurchase[]>('/api/admin/data-requests'),

  updateDataRequestStatus: (id: string, status: 'APPROVED' | 'REJECTED', adminNotes?: string) =>
    apiRequest<DataPurchase>(`/api/admin/data-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    }),

  getAdminLiveStreams: () =>
    apiRequest<LiveStream[]>('/api/admin/live-streams'),

  toggleAdminLiveStream: (id: string) =>
    apiRequest<LiveStream>(`/api/admin/live-streams/${id}/toggle`, {
      method: 'PUT',
    }),

  getAdminRequiredLink: () =>
    apiRequest<RequiredLink>('/api/admin/required-link'),

  updateAdminRequiredLink: (payload: Partial<RequiredLink>) =>
    apiRequest<RequiredLink>('/api/admin/required-link', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getAdminSettings: () =>
    apiRequest<{ siteTitle: string; maintenanceMode: boolean; dailyDataPrice: string; announcementText: string }>('/api/admin/settings'),

  updateAdminSettings: (payload: { siteTitle?: string; maintenanceMode?: boolean; dailyDataPrice?: string; announcementText?: string }) =>
    apiRequest<{ siteTitle: string; maintenanceMode: boolean; dailyDataPrice: string; announcementText: string }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Storage Items (Explorer & Profile Storage)
  getStorageItems: (options: { userId?: string; visibility?: 'public' | 'private' } = {}) => {
    const params = new URLSearchParams();
    if (options.userId) params.append('userId', options.userId);
    if (options.visibility) params.append('visibility', options.visibility);
    const qs = params.toString();
    return apiRequest<{ items: StorageItem[]; total: number }>(`/api/storage/items${qs ? `?${qs}` : ''}`);
  },

  createStorageItem: (payload: {
    type: 'video' | 'image' | 'audio' | 'link' | 'note';
    title: string;
    description?: string;
    fileUrl?: string;
    storagePath?: string;
    linkUrl?: string;
    textContent?: string;
    visibility: 'public' | 'private';
  }) =>
    apiRequest<StorageItem>('/api/storage/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteStorageItem: (id: string) =>
    apiRequest<{ message: string; id: string }>(`/api/storage/items/${id}`, {
      method: 'DELETE',
    }),

  uploadStorageRawFile: async (file: File): Promise<{ url: string; path: string; storagePath: string }> => {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/storage/upload-file', {
      method: 'POST',
      headers,
      body: file,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Storage file upload failed (${res.status})`);
    }

    return res.json();
  },

  // Paid Videos & Pay to Watch
  payToWatchVideo: (videoId: string, paymentMethod = 'wallet') =>
    apiRequest<{ message: string; isLocked: boolean; hasPaid: boolean; videoUrl: string; paymentReference: string }>(
      `/api/videos/${videoId}/pay-to-watch`,
      {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      }
    ),

  // Gifts on Videos
  sendVideoGift: (videoId: string, amount: number, paymentMethod = 'wallet') =>
    apiRequest<{ message: string; gift: VideoGift }>(`/api/videos/${videoId}/gift`, {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod }),
    }),

  getVideoGifts: (videoId: string) =>
    apiRequest<VideoGift[]>(`/api/videos/${videoId}/gifts`),

  // Supabase Status
  getSupabaseStatus: () =>
    apiRequest<{ isConfigured: boolean; databaseProvider: string; hasServiceRoleKey: boolean; message: string }>('/api/supabase/status'),

  // ----------------------------------------------------
  // WALLET & FINANCIALS
  // ----------------------------------------------------
  getWallet: () =>
    apiRequest<WalletData>('/api/wallet'),

  submitDeposit: (payload: { amount: number; senderName: string; screenshotUrl: string; note?: string }) =>
    apiRequest<{ message: string; transaction: WalletTransaction }>('/api/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitWithdrawal: (payload: { amount: number; destinationBank: string; destinationAccountNumber: string; destinationAccountName: string; note?: string }) =>
    apiRequest<{ message: string; transaction: WalletTransaction }>('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadScreenshot: (imageBase64: string) =>
    apiRequest<{ url: string }>('/api/wallet/upload-screenshot', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    }),

  // Admin Wallet Controls
  getAdminWalletTransactions: () =>
    apiRequest<WalletTransaction[]>('/api/admin/wallet/transactions'),

  actionWalletTransaction: (id: string, action: 'APPROVE' | 'REJECT', adminNotes?: string) =>
    apiRequest<{ message: string; transaction: WalletTransaction }>(`/api/admin/wallet/transactions/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, adminNotes }),
    }),

  adjustUserWalletBalance: (userId: string, amount: number, reason?: string) =>
    apiRequest<{ newBalance: number; message: string }>('/api/admin/wallet/adjust-balance', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, reason }),
    }),
};

