import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash?: string;
  role: 'admin' | 'user';
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  createdAt: string;
  googleId?: string;
  isBanned?: boolean;
  walletBalance?: number;
}

export interface WalletTransactionRecord {
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

export interface VideoRecord {
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
  views?: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number; // in seconds
  createdAt: string;
  isRemoved?: boolean;
  isSeasonal?: boolean;
  seasonalCategory?: string;
  visibility?: 'public' | 'private';
  viewingPrice?: number;
}

export interface StorageItemRecord {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  type: 'video' | 'image' | 'audio' | 'link' | 'note';
  title: string;
  description?: string;
  fileUrl?: string;
  storagePath?: string;
  linkUrl?: string;
  textContent?: string;
  visibility: 'public' | 'private';
  createdAt: string;
}

export interface VideoGiftRecord {
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

export interface CommentRecord {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface LikeRecord {
  id: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface DataPurchaseRecord {
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

export interface LiveStreamRecord {
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

export interface LiveChatMessageRecord {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  userAvatar: string;
  message: string;
  timestamp: string;
}

export interface RequiredLinkConfig {
  id: string;
  url: string;
  isEnabled: boolean;
  title: string;
  description: string;
  updatedAt: string;
}

export interface AdminSettingsRecord {
  siteTitle: string;
  adminHeartbeatLastSeen: number;
  maintenanceMode: boolean;
  dailyDataPrice: string;
  announcementText: string;
}

export interface TypingScoreRecord {
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

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'follow' | 'data_status' | 'admin_announcement' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  videos: VideoRecord[];
  comments: CommentRecord[];
  likes: LikeRecord[];
  follows: FollowRecord[];
  dataPurchases: DataPurchaseRecord[];
  liveStreams: LiveStreamRecord[];
  liveChatMessages: LiveChatMessageRecord[];
  requiredLink: RequiredLinkConfig;
  settings: AdminSettingsRecord;
  typingScores: TypingScoreRecord[];
  notifications: NotificationRecord[];
  passwordResetTokens: { token: string; email: string; expiresAt: number }[];
  walletTransactions: WalletTransactionRecord[];
  storageItems: StorageItemRecord[];
  videoGifts: VideoGiftRecord[];
  videoAccess: VideoAccessRecord[];
}

export const PALMPAY_DEPOSIT_CONFIG = {
  bank: 'PalmPay',
  accountNumber: '9076586127',
  accountNumberFormatted: '907  658  6127',
  name: 'ALBERT TERKIMBI UKULA',
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialVideos(): VideoRecord[] {
  // Demo and placeholder videos removed. Videos are only populated through real user uploads via Supabase.
  return [];
}

function getInitialUsers(): UserRecord[] {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('080633Aa@', salt);
  const demoUserHash = bcrypt.hashSync('password123', salt);

  return [
    {
      id: 'usr-admin-nworkaebube',
      email: 'nworkaebube@gmail.com',
      username: 'nworkaebube',
      passwordHash: adminHash,
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Platform Creator & Lead Administrator of Mr Felix Video Network 🎬⚡',
      followersCount: 25000,
      followingCount: 15,
      likesReceivedCount: 78900,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'usr-admin-felix',
      email: 'admin@mrfelix.com',
      username: 'mrfelix_admin',
      passwordHash: adminHash,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Lead Curator of Mr Felix Video Network 🎬⚡',
      followersCount: 12500,
      followingCount: 120,
      likesReceivedCount: 48900,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'usr-felix-official',
      email: 'creator@mrfelix.com',
      username: 'felix_vibes',
      passwordHash: demoUserHash,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Lover of nightscapes, wildlife, and electronic beats. Sharing daily short films.',
      followersCount: 8420,
      followingCount: 340,
      likesReceivedCount: 24200,
      createdAt: '2026-02-10T12:00:00.000Z',
    },
    {
      id: 'usr-amara-dance',
      email: 'amara@mrfelix.com',
      username: 'amara_moves',
      passwordHash: demoUserHash,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      bio: 'Choreographer & Movement Director. Creating visual stories through dance.',
      followersCount: 15300,
      followingCount: 210,
      likesReceivedCount: 52100,
      createdAt: '2026-03-01T09:00:00.000Z',
    },
    {
      id: 'usr-tomiwa-creatives',
      email: 'tomiwa@mrfelix.com',
      username: 'tomiwa_lens',
      passwordHash: demoUserHash,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      bio: 'Cinematographer & Audio Producer. Documenting coastlines and DJ sets.',
      followersCount: 9200,
      followingCount: 180,
      likesReceivedCount: 31400,
      createdAt: '2026-03-15T14:30:00.000Z',
    },
  ];
}

function getInitialLiveStreams(): LiveStreamRecord[] {
  return [
    {
      id: 'live-1',
      creatorId: 'usr-amara-dance',
      creatorUsername: 'amara_moves',
      creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      title: '🔴 Live Choreography Workshop & Q&A',
      category: 'Dance & Arts',
      viewerCount: 1428,
      isLive: true,
      startedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      streamKey: 'live_stream_amara_secure_key_99',
      endpointUrl: 'webrtc://stream.mrfelix.live/live/amara_moves',
      previewImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'live-2',
      creatorId: 'usr-tomiwa-creatives',
      creatorUsername: 'tomiwa_lens',
      creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      title: 'Sunset DJ Vinyl Set & Synth Experiment 🎧',
      category: 'Music & Audio',
      viewerCount: 842,
      isLive: true,
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      streamKey: 'live_stream_tomiwa_synth_key_88',
      endpointUrl: 'webrtc://stream.mrfelix.live/live/tomiwa_lens',
      previewImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'live-3',
      creatorId: 'usr-chef-kofi',
      creatorUsername: 'kofi_eats',
      creatorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      title: 'Late Night Gourmet Street Kitchen Cooking 🥘',
      category: 'Food & Cooking',
      viewerCount: 620,
      isLive: true,
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      streamKey: 'live_stream_kofi_chef_key_77',
      endpointUrl: 'webrtc://stream.mrfelix.live/live/kofi_eats',
      previewImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    },
  ];
}

function getInitialData(): DatabaseSchema {
  const users = getInitialUsers();
  const videos = getInitialVideos();
  const liveStreams = getInitialLiveStreams();

  return {
    users,
    videos,
    comments: [],
    likes: [],
    follows: [
      {
        id: 'flw-1',
        followerId: 'usr-admin-felix',
        followingId: 'usr-felix-official',
        createdAt: '2026-02-15T00:00:00.000Z',
      },
      {
        id: 'flw-2',
        followerId: 'usr-felix-official',
        followingId: 'usr-amara-dance',
        createdAt: '2026-03-05T00:00:00.000Z',
      },
    ],
    dataPurchases: [
      {
        id: 'dp-sample-1',
        userId: 'usr-felix-official',
        username: 'felix_vibes',
        userEmail: 'creator@mrfelix.com',
        phoneNumber: '+2348012345678',
        packageId: 'daily-1gb-250',
        packageName: 'DAILY DATA (1 GB)',
        price: '₦250',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dp-sample-2',
        userId: 'usr-amara-dance',
        username: 'amara_moves',
        userEmail: 'amara@mrfelix.com',
        phoneNumber: '+2348098765432',
        packageId: 'daily-1gb-250',
        packageName: 'DAILY DATA (1 GB)',
        price: '₦250',
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        approvedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        adminNotes: 'Verified and approved by admin queue',
      },
    ],
    liveStreams,
    liveChatMessages: [
      {
        id: 'lcm-1',
        streamId: 'live-1',
        userId: 'usr-tomiwa-creatives',
        username: 'tomiwa_lens',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        message: 'Great footwork on that pivot! 🔥',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'lcm-2',
        streamId: 'live-1',
        userId: 'usr-felix-official',
        username: 'felix_vibes',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        message: 'Hello from Lagos! Loving the stream 🌟',
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
    ],
    requiredLink: {
      id: 'req-link-1',
      url: 'https://example.com/partner-verification',
      isEnabled: false,
      title: 'Important Partner Action',
      description: 'You have an action to complete before continuing on Mr Felix.',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
    settings: {
      siteTitle: 'Mr Felix',
      adminHeartbeatLastSeen: Date.now(),
      maintenanceMode: false,
      dailyDataPrice: '₦250',
      announcementText: 'Welcome to Mr Felix! Browse video feeds, claim high-speed data, tune into live streams, or test your typing speed.',
    },
    typingScores: [
      {
        id: 'ts-1',
        userId: 'usr-admin-felix',
        username: 'mrfelix_admin',
        durationSeconds: 60,
        wordsTyped: 68,
        correctWords: 64,
        incorrectWords: 4,
        accuracy: 94.1,
        wpm: 64,
        timeUsed: 60,
        completedAt: '2026-09-13T15:00:00.000Z',
      },
      {
        id: 'ts-2',
        userId: 'usr-felix-official',
        username: 'felix_vibes',
        durationSeconds: 30,
        wordsTyped: 36,
        correctWords: 34,
        incorrectWords: 2,
        accuracy: 94.4,
        wpm: 68,
        timeUsed: 30,
        completedAt: '2026-09-14T11:00:00.000Z',
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: 'usr-felix-official',
        type: 'data_status',
        title: 'Data Purchase Received',
        message: 'Your request for DAILY DATA 1 GB (₦250) has been submitted and is pending admin approval.',
        link: '/buy-data',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        userId: 'usr-amara-dance',
        type: 'data_status',
        title: 'Data Request Approved!',
        message: 'Your DAILY DATA request has been approved by the platform administrator.',
        link: '/buy-data',
        read: true,
        createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      },
    ],
    passwordResetTokens: [],
    walletTransactions: [],
    storageItems: [],
    videoGifts: [],
    videoAccess: [],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all top-level keys exist in case of schema migrations
        const initial = getInitialData();
        for (const key of Object.keys(initial) as (keyof DatabaseSchema)[]) {
          if (!this.data[key]) {
            (this.data as any)[key] = initial[key];
          }
        }
      } catch (err) {
        console.error('Error reading DB_FILE, reinitializing with defaults', err);
        this.data = getInitialData();
        this.persist();
      }
    } else {
      this.data = getInitialData();
      this.persist();
    }
  }

  public persist() {
    ensureDataDir();
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.persist();
  }

  public update<K extends keyof DatabaseSchema>(key: K, updater: (val: DatabaseSchema[K]) => DatabaseSchema[K]) {
    this.data[key] = updater(this.data[key]);
    this.persist();
  }
}

export const db = new Database();
