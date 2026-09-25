export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  createdAt: string;
  uploadedVideosCount?: number;
  isBanned?: boolean;
  walletBalance?: number;
}

export interface Video {
  id: string;
  creatorId: string;
  userId?: string;
  creatorUsername: string;
  creatorAvatar: string;
  title: string;
  description: string;
  videoUrl: string;
  storagePath?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  musicTitle: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number;
  createdAt: string;
  isLiked?: boolean;
  isFollowing?: boolean;
  isSeasonal?: boolean;
  seasonalCategory?: string;
  visibility?: 'public' | 'private';
  viewingPrice?: number; // In NGN, e.g. 50, 100, 150, 200
  isLocked?: boolean; // True if viewer needs to pay before watching
  hasPaid?: boolean; // True if current viewer has paid/unlocked
}

export type StorageItemType = 'video' | 'image' | 'audio' | 'link' | 'note';
export type StorageItemVisibility = 'public' | 'private';

export interface StorageItem {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  type: StorageItemType;
  title: string;
  description?: string;
  fileUrl?: string;
  storagePath?: string;
  linkUrl?: string;
  textContent?: string;
  visibility: StorageItemVisibility;
  createdAt: string;
}

export interface VideoGift {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  creatorId: string;
  creatorUsername: string;
  videoId: string;
  videoTitle?: string;
  amount: number;
  paymentReference: string;
  paymentStatus: 'successful' | 'pending' | 'failed';
  createdAt: string;
}

export interface VideoAccessRecord {
  id: string;
  userId: string;
  videoId: string;
  creatorId: string;
  amountPaid: number;
  paymentReference: string;
  status: 'successful' | 'pending' | 'failed';
  unlockedAt: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface DataPackage {
  id: string;
  name: string;
  size: string;
  price: string;
  validity: string;
  description: string;
  buttonText: string;
}

export interface DataPurchase {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  phoneNumber: string;
  packageId: string;
  packageName: string;
  price: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string;
  adminNotes?: string;
}

export interface LiveStream {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatar: string;
  title: string;
  category: string;
  viewerCount: number;
  isLive: boolean;
  startedAt: string;
  streamKey: string;
  endpointUrl: string;
  previewImage: string;
}

export interface LiveChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  userAvatar: string;
  message: string;
  timestamp: string;
}

export interface RequiredLink {
  id: string;
  url: string;
  isEnabled: boolean;
  title: string;
  description: string;
  updatedAt: string;
}

export interface SeasonalFilm {
  id: string;
  title: string;
  category: string;
  duration: string;
  director: string;
  synopsis: string;
  poster: string;
  trailerUrl: string;
  badge: string;
}

export interface TypingScore {
  id: string;
  userId?: string;
  username: string;
  durationSeconds: number;
  wordsTyped: number;
  correctWords: number;
  incorrectWords: number;
  accuracy: number;
  wpm: number;
  timeUsed: number;
  completedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'follow' | 'data_status' | 'admin_announcement' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalVideos: number;
  pendingDataRequests: number;
  approvedDataRequests: number;
  rejectedDataRequests: number;
  totalDataRequests: number;
  liveStreamsCount: number;
  activeStreamsCount: number;
  totalLikes: number;
  totalComments: number;
  isAdminOnline: boolean;
  requiredLinkActive: boolean;
  dailyDataPrice: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  type: 'deposit' | 'withdrawal' | 'purchase';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  senderName?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  screenshotUrl?: string;
  destinationBank?: string;
  destinationAccountNumber?: string;
  destinationAccountName?: string;
  note?: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WalletData {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  depositBankDetails: {
    bank: string;
    accountNumber: string;
    name: string;
  };
}

