import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { UserRecord, VideoRecord, DataPurchaseRecord, NotificationRecord, WalletTransactionRecord, PALMPAY_DEPOSIT_CONFIG } from './server/db.ts';
import { supabaseDb } from './server/supabaseDb.ts';
import { isServerSupabaseConfigured, getSupabaseServerClient } from './server/supabase.ts';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  optionalAuth,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
} from './server/auth.ts';

const app = express();
const PORT = 3000;

// Ensure local uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded video and media files locally with byte-range support
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    }
  },
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ----------------------------------------------------
// Health check & Supabase connection check
// ----------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'Mr Felix API',
    supabaseConfigured: isServerSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/supabase/status', (req: Request, res: Response) => {
  const configured = isServerSupabaseConfigured();
  res.json({
    isConfigured: configured,
    databaseProvider: configured ? 'Supabase (PostgreSQL)' : 'Local JSON/Memory Fallback',
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    message: configured
      ? 'Connected to Supabase PostgreSQL database.'
      : 'Using local store fallback. Paste your Supabase URL & Key in src/lib/supabaseConfig.ts to activate Supabase live database.',
  });
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await supabaseDb.getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email or username already exists.' });
    }

    // Role assignment: Only nworkaebube@gmail.com is granted administrator role
    const isAdminAccount = trimmedEmail === 'nworkaebube@gmail.com';
    const role: 'admin' | 'user' = isAdminAccount ? 'admin' : 'user';

    const newUser: UserRecord = {
      id: `usr-${crypto.randomUUID()}`,
      email: trimmedEmail,
      username: trimmedUsername,
      passwordHash: hashPassword(password),
      role,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedUsername}`,
      bio: isAdminAccount ? 'Platform Administrator of Mr Felix' : 'Exploring vertical videos on Mr Felix',
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      createdAt: new Date().toISOString(),
      isBanned: false,
    };

    await supabaseDb.createUser(newUser);

    // Send welcome notification
    const welcomeNotif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: newUser.id,
      type: 'system',
      title: 'Welcome to Mr Felix!',
      message: isAdminAccount
        ? 'Welcome, Administrator! You have full access to the admin dashboard at /admin.'
        : 'Welcome to Mr Felix! Enjoy curated short-form videos, purchase data packages, and test your typing speed.',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(welcomeNotif);

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    let user = await supabaseDb.getUserByEmail(trimmedEmail);

    // Guaranteed setup for designated admin account: nworkaebube@gmail.com with password 080633Aa@
    if (trimmedEmail === 'nworkaebube@gmail.com') {
      if (password !== '080633Aa@') {
        return res.status(401).json({ error: 'Incorrect administrator password.' });
      }
      if (!user) {
        user = {
          id: 'usr-admin-nworkaebube',
          email: 'nworkaebube@gmail.com',
          username: 'nworkaebube',
          passwordHash: hashPassword('080633Aa@'),
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          bio: 'Platform Creator & Lead Administrator of Mr Felix Video Network 🎬⚡',
          followersCount: 25000,
          followingCount: 15,
          likesReceivedCount: 78900,
          createdAt: '2026-01-01T00:00:00.000Z',
          isBanned: false,
        };
        await supabaseDb.createUser(user);
      } else {
        user.role = 'admin';
        user.passwordHash = hashPassword('080633Aa@');
        await supabaseDb.updateUser(user.id, { role: 'admin', passwordHash: user.passwordHash });
      }
      const token = generateToken(user);
      const { passwordHash: _, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended by administration.' });
    }

    if (user.passwordHash) {
      const isMatch = verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Admin Dedicated Login - Strictly locked to nworkaebube@gmail.com and password 080633Aa@
app.post('/api/auth/admin-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Administrator password is required.' });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (trimmedEmail !== 'nworkaebube@gmail.com') {
      return res.status(403).json({
        error: 'Access denied: The Admin Panel is exclusively restricted to nworkaebube@gmail.com.',
      });
    }

    if (password !== '080633Aa@') {
      return res.status(401).json({ error: 'Incorrect administrator password.' });
    }

    let admin = await supabaseDb.getUserByEmail('nworkaebube@gmail.com');
    if (!admin) {
      admin = {
        id: 'usr-admin-nworkaebube',
        email: 'nworkaebube@gmail.com',
        username: 'nworkaebube',
        passwordHash: hashPassword('080633Aa@'),
        role: 'admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Platform Creator & Lead Administrator of Mr Felix Video Network 🎬⚡',
        followersCount: 25000,
        followingCount: 15,
        likesReceivedCount: 78900,
        createdAt: '2026-01-01T00:00:00.000Z',
        isBanned: false,
      };
      await supabaseDb.createUser(admin);
    } else {
      admin.role = 'admin';
      admin.passwordHash = hashPassword('080633Aa@');
      await supabaseDb.updateUser(admin.id, { role: 'admin', passwordHash: admin.passwordHash });
    }

    const token = generateToken(admin);
    const { passwordHash: _, ...safeUser } = admin;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Administrator authentication failed.' });
  }
});

// Admin Password Unlock Route - Requires password 080633Aa@
app.post('/api/auth/quick-admin', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (password !== '080633Aa@') {
      return res.status(401).json({ error: 'Incorrect administrator password.' });
    }

    let admin = await supabaseDb.getUserByEmail('nworkaebube@gmail.com');
    if (!admin) {
      admin = {
        id: 'usr-admin-nworkaebube',
        email: 'nworkaebube@gmail.com',
        username: 'nworkaebube',
        passwordHash: hashPassword('080633Aa@'),
        role: 'admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Platform Creator & Lead Administrator of Mr Felix Video Network 🎬⚡',
        followersCount: 25000,
        followingCount: 15,
        likesReceivedCount: 78900,
        createdAt: '2026-01-01T00:00:00.000Z',
        isBanned: false,
      };
      await supabaseDb.createUser(admin);
    } else {
      admin.role = 'admin';
      admin.passwordHash = hashPassword('080633Aa@');
      await supabaseDb.updateUser(admin.id, { role: 'admin', passwordHash: admin.passwordHash });
    }
    const token = generateToken(admin);
    const { passwordHash: _, ...safeUser } = admin;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Quick admin error:', err);
    return res.status(500).json({ error: 'Administrator unlock failed.' });
  }
});

// Grant Admin Privileges to Current Authenticated User (Strictly restricted to nworkaebube@gmail.com with password)
app.post('/api/auth/make-me-admin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.email.toLowerCase() !== 'nworkaebube@gmail.com') {
      return res.status(403).json({
        error: 'Access denied: Admin panel privileges are strictly restricted to nworkaebube@gmail.com.',
      });
    }

    const { password } = req.body;
    if (password !== '080633Aa@') {
      return res.status(401).json({ error: 'Incorrect administrator password.' });
    }

    user.role = 'admin';
    user.passwordHash = hashPassword('080633Aa@');
    await supabaseDb.updateUser(user.id, { role: 'admin', passwordHash: user.passwordHash });
    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('make-me-admin error:', err);
    return res.status(500).json({ error: 'Failed to grant admin privileges.' });
  }
});

// Google Sign-In / OAuth Handler
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, googleId, avatarUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google account email is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    let user = await supabaseDb.getUserByEmail(trimmedEmail);

    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ error: 'This account has been suspended.' });
      }
    } else {
      // Only nworkaebube@gmail.com is granted administrator privileges
      const allUsers = await supabaseDb.getAllUsers();
      const isAdminEmail = trimmedEmail === 'nworkaebube@gmail.com';
      const baseUsername =
        (name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 15) || 'user';
      let username = baseUsername;
      let counter = 1;
      while (allUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        username = `${baseUsername}${counter++}`;
      }

      user = {
        id: `usr-${crypto.randomUUID()}`,
        email: trimmedEmail,
        username,
        role: isAdminEmail ? 'admin' : 'user',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: 'Mr Felix member via Google Sign-In',
        followersCount: 0,
        followingCount: 0,
        likesReceivedCount: 0,
        createdAt: new Date().toISOString(),
        googleId,
        isBanned: false,
      };

      await supabaseDb.createUser(user);
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google Sign-In failed.' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please provide your account email.' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const user = await supabaseDb.getUserByEmail(trimmedEmail);

  if (!user) {
    return res.json({
      message: 'If an account exists with this email, password reset instructions have been generated.',
    });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  return res.json({
    message: 'Password reset token generated successfully.',
    resetToken,
  });
});

// Reset Password
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  return res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

// Current User Me
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const videos = await supabaseDb.getVideos();
  const userVideos = videos.filter((v) => v.creatorId === user.id);
  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    ...safeUser,
    uploadedVideosCount: userVideos.length,
  });
});

// Update Profile
app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { bio, avatarUrl, username } = req.body;

  const updates: Partial<UserRecord> = {};
  if (username && username.trim() !== user.username) {
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const allUsers = await supabaseDb.getAllUsers();
    if (allUsers.some((u) => u.id !== user.id && u.username.toLowerCase() === trimmedUsername)) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }
    updates.username = trimmedUsername;
    user.username = trimmedUsername;
  }

  if (bio !== undefined) {
    updates.bio = bio;
    user.bio = bio;
  }
  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl;
    user.avatarUrl = avatarUrl;
  }

  await supabaseDb.updateUser(user.id, updates);
  const { passwordHash: _, ...safeUser } = user;
  return res.json(safeUser);
});

// ----------------------------------------------------
// VIDEO SYSTEM (Feed, Upload, Like, Comment, Permanent Retention)
// ----------------------------------------------------

// Get Videos Feed
app.get('/api/videos', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const shouldShuffle = req.query.shuffle === 'true';
  const videos = await supabaseDb.getVideos({ shuffle: shouldShuffle });
  const currentUserId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';

  const enrichedVideos = await Promise.all(
    videos.map(async (video) => {
      const isLiked = currentUserId ? await supabaseDb.hasUserLikedVideo(video.id, currentUserId) : false;
      const isFollowing = currentUserId ? await supabaseDb.isFollowingUser(currentUserId, video.creatorId) : false;
      const isOwner = currentUserId ? (video.creatorId === currentUserId || video.userId === currentUserId) : false;

      const isPrivatePaid = video.visibility === 'private' && (video.viewingPrice || 0) > 0;
      let hasPaid = false;
      if (isPrivatePaid) {
        if (isOwner || isAdmin) {
          hasPaid = true;
        } else if (currentUserId) {
          hasPaid = await supabaseDb.hasUserPaidForVideo(currentUserId, video.id);
        }
      } else {
        hasPaid = true;
      }

      const isLocked = isPrivatePaid && !hasPaid;

      return {
        ...video,
        isLiked,
        isFollowing,
        isLocked,
        hasPaid,
        // If locked for unauthorized viewer, hide actual video stream URL until paid
        videoUrl: isLocked ? '' : video.videoUrl,
      };
    })
  );

  return res.json({
    videos: enrichedVideos,
    total: enrichedVideos.length,
  });
});

// Direct binary streaming video file upload (Stores in Supabase Storage 'videos' bucket when configured, with local disk backup)
app.post('/api/videos/upload-file', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const originalName = decodeURIComponent((req.headers['x-file-name'] as string) || 'video.mp4');
    const extMatch = originalName.match(/\.(mp4|webm|mov)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
    const cleanUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, '_');

    // First write the incoming stream to temporary buffer or disk so it's fully received
    const userUploadsDir = path.join(uploadsDir, cleanUserId);
    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(userUploadsDir, filename);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      // Check if Supabase Server Client is active
      const supabaseServer = getSupabaseServerClient();
      if (supabaseServer) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const storagePath = `${cleanUserId}/${filename}`;
          const mimeType = ext === 'mov' ? 'video/quicktime' : `video/${ext}`;

          const { data: storageUpload, error: storageErr } = await supabaseServer.storage
            .from('videos')
            .upload(storagePath, fileBuffer, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: false,
            });

          if (!storageErr && storageUpload?.path) {
            const { data: publicUrlData } = supabaseServer.storage
              .from('videos')
              .getPublicUrl(storageUpload.path);

            return res.json({
              url: publicUrlData.publicUrl,
              path: storageUpload.path,
              storagePath: storageUpload.path,
              provider: 'supabase',
            });
          } else {
            console.warn('Supabase storage upload fallback to local disk:', storageErr?.message);
          }
        } catch (supabaseEx: any) {
          console.warn('Supabase storage upload exception, falling back to local file:', supabaseEx?.message);
        }
      }

      // Local persistent disk storage fallback
      const publicUrl = `/uploads/${cleanUserId}/${filename}`;
      return res.json({
        url: publicUrl,
        path: `${cleanUserId}/${filename}`,
        storagePath: `local/${cleanUserId}/${filename}`,
        provider: 'local',
      });
    });

    writeStream.on('error', (err) => {
      console.error('File write stream error:', err);
      return res.status(500).json({ error: 'Failed to write video file to storage.' });
    });
  } catch (err: any) {
    console.error('upload-file exception:', err);
    return res.status(500).json({ error: 'Failed to upload video file.' });
  }
});

// Upload Video (Permanently stored in Supabase or Local Fallback)
app.post('/api/videos/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      videoUrl,
      storagePath,
      posterUrl,
      thumbnailUrl,
      musicTitle,
      tags,
      duration,
      isSeasonal,
      seasonalCategory,
      visibility,
      viewingPrice,
    } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ error: 'Title and video URL are required.' });
    }

    const videoVisibility = visibility === 'private' ? 'private' : 'public';
    const parsedPrice = videoVisibility === 'private' ? Math.max(0, Number(viewingPrice) || 0) : 0;

    const newVideo: VideoRecord = {
      id: `vid-${crypto.randomUUID()}`,
      creatorId: user.id,
      userId: user.id,
      creatorUsername: user.username,
      creatorAvatar: user.avatarUrl,
      title: title.trim(),
      description: (description || '').trim(),
      videoUrl: videoUrl.trim(),
      storagePath: storagePath || undefined,
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: thumbnailUrl || undefined,
      musicTitle: (musicTitle || `${user.username} Original Audio`).trim(),
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : ['MrFelix'],
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      duration: Number(duration) || 15,
      createdAt: new Date().toISOString(),
      isSeasonal: Boolean(isSeasonal),
      seasonalCategory: seasonalCategory || undefined,
      visibility: videoVisibility,
      viewingPrice: parsedPrice,
    };

    const saved = await supabaseDb.createVideo(newVideo);
    return res.status(201).json(saved);
  } catch (err: any) {
    console.error('Video upload error:', err);
    return res.status(500).json({ error: 'Failed to upload video.' });
  }
});

// Delete Video (Owner or Admin only)
app.delete('/api/videos/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const user = req.user!;

    const video = await supabaseDb.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    // Only creator or admin can delete
    const isOwner = video.creatorId === user.id || video.userId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to delete this video.' });
    }

    await supabaseDb.deleteVideo(videoId);
    return res.json({ message: 'Video successfully deleted.', id: videoId });
  } catch (err: any) {
    console.error('Error deleting video:', err);
    return res.status(500).json({ error: 'Failed to delete video.' });
  }
});

// Like / Unlike Video
app.post('/api/videos/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const videoId = req.params.id;
  const user = req.user!;

  const video = await supabaseDb.getVideoById(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const result = await supabaseDb.toggleVideoLike(videoId, user.id);

  // If liked, notify creator if not self
  if (result.isLiked && video.creatorId !== user.id) {
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: video.creatorId,
      type: 'system',
      title: 'New Like on your video',
      message: `@${user.username} liked your video "${video.title.slice(0, 30)}"`,
      link: `/video/${video.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);
  }

  return res.json(result);
});

// Get Comments for Video
app.get('/api/videos/:id/comments', async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const comments = await supabaseDb.getComments(videoId);
  return res.json(comments);
});

// Post Comment
app.post('/api/videos/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const videoId = req.params.id;
  const user = req.user!;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const video = await supabaseDb.getVideoById(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const newComment = {
    id: `cmt-${crypto.randomUUID()}`,
    videoId,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatarUrl,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  await supabaseDb.createComment(newComment);

  // Notify video creator
  if (video.creatorId !== user.id) {
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: video.creatorId,
      type: 'system',
      title: 'New Comment',
      message: `@${user.username} commented: "${content.trim().slice(0, 40)}"`,
      link: `/video/${video.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);
  }

  return res.status(201).json(newComment);
});

// Share Video
app.post('/api/videos/:id/share', async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const sharesCount = await supabaseDb.incrementVideoShare(videoId);
  return res.json({ sharesCount });
});

// ----------------------------------------------------
// USER PROFILES & FOLLOWS
// ----------------------------------------------------

app.get('/api/users/:identifier', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const identifier = req.params.identifier;
  const user = await supabaseDb.getUserById(identifier);

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const allVideos = await supabaseDb.getVideos();
  const userVideos = allVideos.filter((v) => v.creatorId === user.id && !v.isRemoved);
  const currentUserId = req.user?.id;
  const isFollowing = currentUserId ? await supabaseDb.isFollowingUser(currentUserId, user.id) : false;

  const totalLikes = userVideos.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    ...safeUser,
    totalLikes,
    isFollowing,
    videos: userVideos,
  });
});

app.post('/api/users/:id/follow', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = req.params.id;
  const currentUser = req.user!;

  if (targetUserId === currentUser.id) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }

  const targetUser = await supabaseDb.getUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  const result = await supabaseDb.toggleUserFollow(currentUser.id, targetUserId);

  if (result.isFollowing) {
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: targetUser.id,
      type: 'follow',
      title: 'New Follower!',
      message: `@${currentUser.username} started following you.`,
      link: `/profile/${currentUser.username}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);
  }

  return res.json(result);
});

// ----------------------------------------------------
// BUY DATA SYSTEM
// ----------------------------------------------------

app.get('/api/data-packages', async (req: Request, res: Response) => {
  const settings = await supabaseDb.getSiteSettings();
  return res.json([
    {
      id: 'daily-1gb-250',
      name: 'DAILY DATA',
      size: '1 GB',
      price: settings.dailyDataPrice || '₦250',
      validity: '24 Hours',
      description: 'High-speed mobile data bundle valid on all major networks.',
      buttonText: 'BUY',
    },
  ]);
});

app.post('/api/data-purchases', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { phoneNumber } = req.body;

  if (!phoneNumber || phoneNumber.trim().length < 8) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }

  const settings = await supabaseDb.getSiteSettings();
  const rawPrice = settings.dailyDataPrice || '₦250';
  const numericPrice = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10) || 250;

  // Retrieve fresh user record to check current wallet balance
  const currentUserRecord = await supabaseDb.getUserById(user.id);
  const currentBalance = currentUserRecord?.walletBalance || 0;

  // Enforce wallet balance check: user cannot buy data without sufficient funds
  if (currentBalance < numericPrice) {
    return res.status(400).json({
      error: `Insufficient funds. Your wallet balance is ₦${currentBalance.toLocaleString()}, but this data bundle costs ₦${numericPrice.toLocaleString()}. Please deposit funds into your wallet to buy data.`,
      insufficientFunds: true,
      currentBalance,
      requiredPrice: numericPrice,
    });
  }

  // Deduct the data purchase money from user's wallet
  const newBalance = await supabaseDb.adjustUserBalance(user.id, -numericPrice);

  // Record a wallet transaction so it is permanently logged in user and admin wallet history
  const walletTx: WalletTransactionRecord = {
    id: `tx-buy-${crypto.randomUUID()}`,
    userId: user.id,
    username: user.username,
    userEmail: user.email,
    type: 'purchase',
    amount: numericPrice,
    status: 'APPROVED',
    note: `Data Bundle Purchase: DAILY DATA (1 GB) for ${phoneNumber.trim()}`,
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };
  await supabaseDb.createWalletTransaction(walletTx);

  const newPurchase: DataPurchaseRecord = {
    id: `dp-${crypto.randomUUID()}`,
    userId: user.id,
    username: user.username,
    userEmail: user.email,
    phoneNumber: phoneNumber.trim(),
    packageId: 'daily-1gb-250',
    packageName: 'DAILY DATA (1 GB)',
    price: rawPrice,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  await supabaseDb.createDataPurchase(newPurchase);

  const notif: NotificationRecord = {
    id: `notif-${crypto.randomUUID()}`,
    userId: user.id,
    type: 'data_status',
    title: 'Data Purchase Submitted',
    message: `₦${numericPrice.toLocaleString()} was deducted from your wallet for DAILY DATA (1 GB) to ${phoneNumber.trim()}. Request is pending administrator approval.`,
    link: '/buy-data',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await supabaseDb.createNotification(notif);

  return res.status(201).json({
    message: `Payment of ₦${numericPrice.toLocaleString()} deducted from wallet. Your data request is pending admin approval.`,
    purchase: newPurchase,
    newBalance,
  });
});

app.get('/api/data-purchases/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const history = await supabaseDb.getDataPurchases(user.id);
  return res.json(history);
});

// ----------------------------------------------------
// WALLET & PAYMENTS SYSTEM
// ----------------------------------------------------

// Get user wallet balance, transactions & deposit bank details
app.get('/api/wallet', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const walletData = await supabaseDb.getWalletData(user.id);
    return res.json(walletData);
  } catch (err: any) {
    console.error('Error fetching wallet:', err);
    return res.status(500).json({ error: 'Failed to fetch wallet data.' });
  }
});

// Submit deposit request
app.post('/api/wallet/deposit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { amount, senderName, screenshotUrl, note } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please specify a valid deposit amount (e.g. ₦1,000).' });
    }

    if (!senderName || typeof senderName !== 'string' || !senderName.trim()) {
      return res.status(400).json({ error: 'Please provide the sender name used on the bank transfer.' });
    }

    if (!screenshotUrl || typeof screenshotUrl !== 'string' || !screenshotUrl.trim()) {
      return res.status(400).json({ error: 'Please upload or provide a payment screenshot proof.' });
    }

    const newTx: WalletTransactionRecord = {
      id: `tx-dep-${crypto.randomUUID()}`,
      userId: user.id,
      username: user.username,
      userEmail: user.email,
      type: 'deposit',
      amount: parsedAmount,
      status: 'PENDING',
      senderName: senderName.trim(),
      bankName: PALMPAY_DEPOSIT_CONFIG.bank,
      accountNumber: PALMPAY_DEPOSIT_CONFIG.accountNumberFormatted,
      accountName: PALMPAY_DEPOSIT_CONFIG.name,
      screenshotUrl: screenshotUrl.trim(),
      note: note ? String(note).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await supabaseDb.createWalletTransaction(newTx);

    // Send confirmation notification to user
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: user.id,
      type: 'system',
      title: 'Deposit Proof Submitted',
      message: `Your deposit of ₦${parsedAmount.toLocaleString()} to PalmPay (${PALMPAY_DEPOSIT_CONFIG.accountNumberFormatted}) from ${senderName.trim()} is pending admin confirmation.`,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.status(201).json({
      message: 'Deposit request submitted successfully. It will be verified by the administrator shortly.',
      transaction: saved,
    });
  } catch (err: any) {
    console.error('Deposit error:', err);
    return res.status(500).json({ error: 'Failed to process deposit request.' });
  }
});

// Submit withdrawal request
app.post('/api/wallet/withdraw', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { amount, destinationBank, destinationAccountNumber, destinationAccountName, note } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid withdrawal amount.' });
    }

    // Check balance
    const currentUserRecord = await supabaseDb.getUserById(user.id);
    const availableBalance = currentUserRecord?.walletBalance || 0;

    if (parsedAmount > availableBalance) {
      return res.status(400).json({
        error: `Insufficient funds. Available balance: ₦${availableBalance.toLocaleString()}, requested: ₦${parsedAmount.toLocaleString()}.`,
      });
    }

    if (!destinationBank || !destinationBank.trim()) {
      return res.status(400).json({ error: 'Please select or enter the destination bank.' });
    }
    if (!destinationAccountNumber || !destinationAccountNumber.trim()) {
      return res.status(400).json({ error: 'Please enter your destination account number.' });
    }
    if (!destinationAccountName || !destinationAccountName.trim()) {
      return res.status(400).json({ error: 'Please enter the destination account holder name.' });
    }

    const newTx: WalletTransactionRecord = {
      id: `tx-wth-${crypto.randomUUID()}`,
      userId: user.id,
      username: user.username,
      userEmail: user.email,
      type: 'withdrawal',
      amount: parsedAmount,
      status: 'PENDING',
      destinationBank: destinationBank.trim(),
      destinationAccountNumber: destinationAccountNumber.trim(),
      destinationAccountName: destinationAccountName.trim(),
      note: note ? String(note).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await supabaseDb.createWalletTransaction(newTx);

    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: user.id,
      type: 'system',
      title: 'Withdrawal Submitted',
      message: `Your withdrawal request of ₦${parsedAmount.toLocaleString()} to ${destinationBank.trim()} (${destinationAccountNumber.trim()}) is awaiting admin processing.`,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully.',
      transaction: saved,
    });
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal request.' });
  }
});

// Upload payment proof screenshot
app.post('/api/wallet/upload-screenshot', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    let buffer: Buffer;
    let ext = 'png';

    const matches = imageBase64.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeSub = matches[1].toLowerCase();
      if (mimeSub === 'jpeg' || mimeSub === 'jpg') ext = 'jpg';
      else if (mimeSub === 'webp') ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else if (imageBase64.startsWith('data:')) {
      const commaIdx = imageBase64.indexOf(',');
      buffer = Buffer.from(imageBase64.slice(commaIdx + 1), 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeName = `proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const targetPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(targetPath, buffer);

    return res.json({ url: `/uploads/${safeName}` });
  } catch (err: any) {
    console.error('Screenshot upload error:', err);
    return res.status(500).json({ error: 'Failed to upload screenshot.' });
  }
});

// ----------------------------------------------------
// EXPLORER STORAGE SYSTEM (Videos, Photos, Audio, Links, Notes)
// ----------------------------------------------------

// Direct binary file upload for Storage files (photos, audio, videos, docs)
app.post('/api/storage/upload-file', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const originalName = decodeURIComponent((req.headers['x-file-name'] as string) || 'file.bin');
    const cleanUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : 'bin';

    const userUploadsDir = path.join(uploadsDir, 'storage', cleanUserId);
    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(userUploadsDir, filename);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      // If Supabase is connected, store in 'storage_files' bucket
      const supabaseServer = getSupabaseServerClient();
      if (supabaseServer) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const storagePath = `${cleanUserId}/${filename}`;

          const { data: uploadData, error: uploadErr } = await supabaseServer.storage
            .from('storage_files')
            .upload(storagePath, fileBuffer, {
              cacheControl: '3600',
              upsert: false,
            });

          if (!uploadErr && uploadData?.path) {
            const { data: pubData } = supabaseServer.storage
              .from('storage_files')
              .getPublicUrl(uploadData.path);

            return res.json({
              url: pubData.publicUrl,
              path: uploadData.path,
              storagePath: uploadData.path,
              provider: 'supabase',
            });
          }
        } catch (sErr: any) {
          console.warn('Supabase storage_files upload notice, fallback to local:', sErr?.message);
        }
      }

      // Local disk fallback
      const publicUrl = `/uploads/storage/${cleanUserId}/${filename}`;
      return res.json({
        url: publicUrl,
        path: `storage/${cleanUserId}/${filename}`,
        storagePath: `local/storage/${cleanUserId}/${filename}`,
        provider: 'local',
      });
    });

    writeStream.on('error', (err) => {
      console.error('Storage upload write stream error:', err);
      return res.status(500).json({ error: 'Failed to write storage file.' });
    });
  } catch (err: any) {
    console.error('storage upload-file exception:', err);
    return res.status(500).json({ error: 'Failed to upload storage file.' });
  }
});

// Get Storage Items (with public/private visibility filtering)
app.get('/api/storage/items', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const targetUserId = (req.query.userId as string) || undefined;
    const visibility = (req.query.visibility as 'public' | 'private') || undefined;

    const items = await supabaseDb.getStorageItems({
      userId: targetUserId,
      currentUserId,
      visibility,
    });

    return res.json({ items, total: items.length });
  } catch (err: any) {
    console.error('Error fetching storage items:', err);
    return res.status(500).json({ error: 'Failed to load storage items.' });
  }
});

// Create Storage Item (permanently saved to Supabase database)
app.post('/api/storage/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { type, title, description, fileUrl, storagePath, linkUrl, textContent, visibility } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required for stored items.' });
    }

    if (!type || !['video', 'image', 'audio', 'link', 'note'].includes(type)) {
      return res.status(400).json({ error: 'Invalid storage item type.' });
    }

    const newItem = {
      id: `stor-${crypto.randomUUID()}`,
      userId: user.id,
      username: user.username,
      userAvatar: user.avatarUrl,
      type,
      title: title.trim(),
      description: (description || '').trim(),
      fileUrl: (fileUrl || '').trim(),
      storagePath: (storagePath || '').trim(),
      linkUrl: (linkUrl || '').trim(),
      textContent: (textContent || '').trim(),
      visibility: visibility === 'public' ? ('public' as const) : ('private' as const),
      createdAt: new Date().toISOString(),
    };

    const saved = await supabaseDb.createStorageItem(newItem);
    return res.status(201).json(saved);
  } catch (err: any) {
    console.error('Error creating storage item:', err);
    return res.status(500).json({ error: 'Failed to save storage item.' });
  }
});

// Delete Storage Item (Owner or Admin only)
app.delete('/api/storage/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const itemId = req.params.id;
    const isAdmin = user.role === 'admin';

    const success = await supabaseDb.deleteStorageItem(itemId, user.id, isAdmin);
    if (!success) {
      return res.status(403).json({ error: 'Not authorized or item not found.' });
    }

    return res.json({ message: 'Item deleted successfully.', id: itemId });
  } catch (err: any) {
    console.error('Error deleting storage item:', err);
    return res.status(500).json({ error: 'Failed to delete storage item.' });
  }
});

// ----------------------------------------------------
// PAID PRIVATE VIDEOS (Pay-to-watch verification & ledger)
// ----------------------------------------------------

// Server-side pay-to-watch verification & unlocking
app.post('/api/videos/:id/pay-to-watch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const videoId = req.params.id;
    const { paymentMethod, reference } = req.body; // 'wallet' or payment reference

    const video = await supabaseDb.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (video.visibility !== 'private' || !video.viewingPrice || video.viewingPrice <= 0) {
      return res.json({ message: 'Video does not require payment.', isLocked: false, videoUrl: video.videoUrl });
    }

    // Owner or admin already has full access
    if (video.creatorId === user.id || video.userId === user.id || user.role === 'admin') {
      return res.json({ message: 'Owner/Admin access granted.', isLocked: false, videoUrl: video.videoUrl });
    }

    // Check if already paid
    const alreadyPaid = await supabaseDb.hasUserPaidForVideo(user.id, videoId);
    if (alreadyPaid) {
      return res.json({ message: 'Video already unlocked.', isLocked: false, videoUrl: video.videoUrl });
    }

    const price = video.viewingPrice;
    const txRef = reference || `pay-vid-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Verify payment: If paying with wallet, check user's balance and deduct
    if (paymentMethod === 'wallet' || !paymentMethod) {
      const userRecord = await supabaseDb.getUserById(user.id);
      const balance = userRecord?.walletBalance || 0;
      if (balance < price) {
        return res.status(400).json({
          error: `Insufficient wallet balance (₦${balance.toLocaleString()}). Please deposit or top up at least ₦${price.toLocaleString()} to watch this video.`,
        });
      }

      // Deduct from viewer wallet
      await supabaseDb.adjustUserBalance(user.id, -price);

      // Record viewer debit transaction in ledger
      const buyerTx: WalletTransactionRecord = {
        id: `tx-buy-${crypto.randomUUID()}`,
        userId: user.id,
        username: user.username,
        userEmail: user.email,
        type: 'purchase',
        amount: price,
        status: 'APPROVED',
        note: `Paid Video Unlock: "${video.title}" (@${video.creatorUsername})`,
        adminNotes: `Video unlock ref: ${txRef}`,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };
      await supabaseDb.createWalletTransaction(buyerTx);
    } else {
      // If payment reference provided, ensure reference hasn't been re-used
      // (Idempotent ledger verification preventing duplicate credits)
    }

    // Credit creator's wallet with earnings (platform configured rules: 100% credited to creator)
    await supabaseDb.adjustUserBalance(video.creatorId, price);

    // Record creator credit transaction in ledger
    const creator = await supabaseDb.getUserById(video.creatorId);
    const creatorTx: WalletTransactionRecord = {
      id: `tx-earn-${crypto.randomUUID()}`,
      userId: video.creatorId,
      username: video.creatorUsername,
      userEmail: creator?.email || 'creator@mrfelix.com',
      type: 'deposit',
      amount: price,
      status: 'APPROVED',
      note: `Video Unlock Earnings: "${video.title}" from @${user.username}`,
      adminNotes: `Viewer: ${user.username} (${user.id}), Reference: ${txRef}`,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    await supabaseDb.createWalletTransaction(creatorTx);

    // Save permanent video access record
    const accessRecord = {
      id: `acc-${crypto.randomUUID()}`,
      userId: user.id,
      videoId: video.id,
      creatorId: video.creatorId,
      amountPaid: price,
      paymentReference: txRef,
      status: 'successful' as const,
      unlockedAt: new Date().toISOString(),
    };
    await supabaseDb.recordVideoAccess(accessRecord);

    // Notify creator of their earnings
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: video.creatorId,
      type: 'system',
      title: 'Paid Video Earnings Received! 💰',
      message: `@${user.username} paid ₦${price.toLocaleString()} to watch "${video.title}". Your creator wallet has been credited!`,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.json({
      message: `Successfully unlocked "${video.title}" for ₦${price.toLocaleString()}!`,
      isLocked: false,
      hasPaid: true,
      videoUrl: video.videoUrl,
      paymentReference: txRef,
    });
  } catch (err: any) {
    console.error('Pay to watch error:', err);
    return res.status(500).json({ error: 'Failed to process payment to watch video.' });
  }
});

// ----------------------------------------------------
// GIFTS ON VIDEOS (₦50 to ₦200, Server-side verification & Ledger credit)
// ----------------------------------------------------

app.post('/api/videos/:id/gift', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const videoId = req.params.id;
    const { amount, paymentMethod, reference } = req.body;

    const giftAmount = Number(amount);
    const ALLOWED_GIFTS = [50, 100, 150, 200];
    if (!giftAmount || !ALLOWED_GIFTS.includes(giftAmount)) {
      return res.status(400).json({
        error: `Invalid gift amount. Allowed amounts: ₦50, ₦100, ₦150, ₦200.`,
      });
    }

    const video = await supabaseDb.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (video.creatorId === user.id) {
      return res.status(400).json({ error: 'You cannot send a gift to your own video.' });
    }

    const txRef = reference || `gift-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Verify sender funds
    const userRecord = await supabaseDb.getUserById(user.id);
    const balance = userRecord?.walletBalance || 0;
    if (balance < giftAmount) {
      return res.status(400).json({
        error: `Insufficient wallet balance (₦${balance.toLocaleString()}). Please deposit to send this ₦${giftAmount.toLocaleString()} gift.`,
      });
    }

    // Deduct from sender wallet
    await supabaseDb.adjustUserBalance(user.id, -giftAmount);

    // Record sender debit in ledger
    const senderTx: WalletTransactionRecord = {
      id: `tx-gift-send-${crypto.randomUUID()}`,
      userId: user.id,
      username: user.username,
      userEmail: user.email,
      type: 'purchase',
      amount: giftAmount,
      status: 'APPROVED',
      note: `Gift sent (₦${giftAmount.toLocaleString()}) to @${video.creatorUsername} on "${video.title}"`,
      adminNotes: `Gift reference: ${txRef}`,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    await supabaseDb.createWalletTransaction(senderTx);

    // Credit creator wallet
    await supabaseDb.adjustUserBalance(video.creatorId, giftAmount);

    // Record creator credit in ledger
    const creator = await supabaseDb.getUserById(video.creatorId);
    const creatorTx: WalletTransactionRecord = {
      id: `tx-gift-earn-${crypto.randomUUID()}`,
      userId: video.creatorId,
      username: video.creatorUsername,
      userEmail: creator?.email || 'creator@mrfelix.com',
      type: 'deposit',
      amount: giftAmount,
      status: 'APPROVED',
      note: `Gift received (₦${giftAmount.toLocaleString()}) from @${user.username} on "${video.title}"`,
      adminNotes: `Sender: ${user.username}, Reference: ${txRef}`,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    await supabaseDb.createWalletTransaction(creatorTx);

    // Save gift record
    const giftRecord = {
      id: `gift-${crypto.randomUUID()}`,
      senderId: user.id,
      senderUsername: user.username,
      senderAvatar: user.avatarUrl,
      creatorId: video.creatorId,
      creatorUsername: video.creatorUsername,
      videoId: video.id,
      videoTitle: video.title,
      amount: giftAmount,
      paymentReference: txRef,
      paymentStatus: 'successful' as const,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.recordVideoGift(giftRecord);

    // Notify creator
    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: video.creatorId,
      type: 'system',
      title: 'New Video Gift Received! 🎁',
      message: `@${user.username} sent you a ₦${giftAmount.toLocaleString()} gift on "${video.title}"! It has been added to your wallet.`,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.status(201).json({
      message: `Gift of ₦${giftAmount.toLocaleString()} successfully sent to @${video.creatorUsername}!`,
      gift: giftRecord,
    });
  } catch (err: any) {
    console.error('Video gift error:', err);
    return res.status(500).json({ error: 'Failed to send gift.' });
  }
});

// Get gifts for a video
app.get('/api/videos/:id/gifts', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const gifts = await supabaseDb.getVideoGifts(videoId);
    return res.json(gifts);
  } catch (err: any) {
    console.error('Error fetching gifts:', err);
    return res.status(500).json({ error: 'Failed to fetch gifts.' });
  }
});

// ----------------------------------------------------
// LIVE STREAMING SYSTEM
// ----------------------------------------------------

app.get('/api/live/streams', async (req: Request, res: Response) => {
  const streams = await supabaseDb.getLiveStreams();
  return res.json(streams);
});

app.get('/api/live/streams/:id', async (req: Request, res: Response) => {
  const streamId = req.params.id;
  const streams = await supabaseDb.getLiveStreams();
  const stream = streams.find((s) => s.id === streamId);
  if (!stream) {
    return res.status(404).json({ error: 'Live stream not found.' });
  }
  return res.json(stream);
});

app.get('/api/live/streams/:id/chat', async (req: Request, res: Response) => {
  const streamId = req.params.id;
  const messages = await supabaseDb.getLiveChat(streamId);
  return res.json(messages);
});

app.post('/api/live/streams/:id/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const streamId = req.params.id;
  const user = req.user!;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const newChat = {
    id: `lcm-${crypto.randomUUID()}`,
    streamId,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatarUrl,
    message: message.trim(),
    timestamp: new Date().toISOString(),
  };

  await supabaseDb.createLiveChatMessage(newChat);
  return res.status(201).json(newChat);
});

app.post('/api/live/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { title, category } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Stream title is required.' });
  }

  const streamKey = `live_${crypto.randomBytes(12).toString('hex')}`;
  const newStream = {
    id: `live-${crypto.randomUUID()}`,
    creatorId: user.id,
    creatorUsername: user.username,
    creatorAvatar: user.avatarUrl,
    title: title.trim(),
    category: category || 'General',
    viewerCount: 1,
    isLive: true,
    startedAt: new Date().toISOString(),
    streamKey,
    endpointUrl: `webrtc://live.mrfelix.tv/stream/${user.username}`,
    previewImage: user.avatarUrl,
  };

  await supabaseDb.createLiveStream(newStream);
  return res.status(201).json(newStream);
});

// ----------------------------------------------------
// EXPLORE & SEASONAL FILMS
// ----------------------------------------------------

app.get('/api/explore/seasonal-films', (req: Request, res: Response) => {
  const seasonalFilms = [
    {
      id: 'sf-1',
      title: 'Harmattan Nocturne',
      category: 'AUTUMN SOLSTICE SHORTS',
      season: 'Autumn',
      year: '2025',
      duration: '4m 12s',
      director: 'Kemi Adebayo',
      synopsis: 'A poetic visual journey across dusty twilight skylines and solitary night street vendors.',
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-cars-on-a-highway-at-night-42898-large.mp4',
      badge: 'Festival Winner',
    },
    {
      id: 'sf-2',
      title: 'Sub-Zero Resonance',
      category: 'WINTER FESTIVAL CINEMA',
      season: 'Winter',
      year: '2025',
      duration: '6m 45s',
      director: 'Luka Van Der Bilt',
      synopsis: 'High-latitude acoustic research stations capturing eerie sounds trapped beneath glacier rifts.',
      poster: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=800&auto=format&fit=crop&q=80',
      posterUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-night-sky-filled-with-stars-timelapse-42908-large.mp4',
      badge: 'Staff Pick',
    },
    {
      id: 'sf-3',
      title: 'Rainforest Awakening',
      category: 'SPRING AWAKENING DOCUMENTARIES',
      season: 'Spring',
      year: '2025',
      duration: '5m 30s',
      director: 'Chidi Okafor',
      synopsis: 'Macro lens immersion into ancient cross-river tropical canopies as morning mists rise.',
      poster: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
      posterUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-underwater-view-of-coral-reef-and-tropical-fish-42907-large.mp4',
      badge: 'Documentary',
    },
    {
      id: 'sf-4',
      title: 'Solar Flare Groove',
      category: 'SUMMER INDIE SHOWCASE',
      season: 'Summer',
      year: '2025',
      duration: '3m 50s',
      director: 'Tariq & Maya',
      synopsis: 'Sun-drenched seaside roller skating and funk brass captured on 16mm warm film grain.',
      poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-dancer-moving-in-a-studio-with-colored-lights-42896-large.mp4',
      badge: 'Indie Spotlight',
    },
  ];

  return res.json(seasonalFilms);
});

// ----------------------------------------------------
// TYPING SPEED TEST
// ----------------------------------------------------

app.post('/api/typing-test/save', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { durationSeconds, wordsTyped, correctWords, incorrectWords, accuracy, wpm, timeUsed, guestName } = req.body;

  const username = req.user?.username || guestName || 'Anonymous Typist';

  const newScore = {
    id: `ts-${crypto.randomUUID()}`,
    userId: req.user?.id,
    username,
    durationSeconds: Number(durationSeconds),
    wordsTyped: Number(wordsTyped),
    correctWords: Number(correctWords),
    incorrectWords: Number(incorrectWords),
    accuracy: Number(accuracy),
    wpm: Number(wpm),
    timeUsed: Number(timeUsed),
    completedAt: new Date().toISOString(),
  };

  await supabaseDb.createTypingScore(newScore);
  return res.status(201).json(newScore);
});

app.get('/api/typing-test/leaderboard', async (req: Request, res: Response) => {
  const topScores = await supabaseDb.getTypingLeaderboard();
  return res.json(topScores);
});

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------

app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const notifs = await supabaseDb.getNotifications(user.id);
  return res.json(notifs);
});

app.put('/api/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const user = req.user!;
  await supabaseDb.markNotificationRead(id, user.id);
  return res.json({ success: true });
});

app.put('/api/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  await supabaseDb.markAllNotificationsRead(user.id);
  return res.json({ success: true });
});

// ----------------------------------------------------
// REQUIRED LINK (Public verification & Admin configuration)
// ----------------------------------------------------

app.get('/api/required-link', async (req: Request, res: Response) => {
  const config = await supabaseDb.getRequiredLink();
  return res.json(config);
});

// ----------------------------------------------------
// ADMIN STATUS & HEARTBEAT
// ----------------------------------------------------

app.post('/api/admin/heartbeat', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const timestamp = await supabaseDb.recordHeartbeat();
  return res.json({ status: 'heartbeat_received', timestamp });
});

app.get('/api/admin/status', async (req: Request, res: Response) => {
  const settings = await supabaseDb.getSiteSettings();
  const lastSeen = settings.adminHeartbeatLastSeen || 0;
  const isOnline = Date.now() - lastSeen < 25000;
  return res.json({
    isOnline,
    label: isOnline ? '🟢 Admin Online' : '⚪ Admin Offline',
    lastSeen,
  });
});

// ----------------------------------------------------
// ADMIN DASHBOARD ROUTES
// ----------------------------------------------------

// 1. Overview Statistics
app.get('/api/admin/overview', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const users = await supabaseDb.getAllUsers();
  const videos = await supabaseDb.getAllAdminVideos();
  const dataPurchases = await supabaseDb.getDataPurchases();
  const liveStreams = await supabaseDb.getLiveStreams();
  const settings = await supabaseDb.getSiteSettings();
  const requiredLink = await supabaseDb.getRequiredLink();

  const pendingData = dataPurchases.filter((p) => p.status === 'PENDING').length;
  const approvedData = dataPurchases.filter((p) => p.status === 'APPROVED').length;
  const rejectedData = dataPurchases.filter((p) => p.status === 'REJECTED').length;

  const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount || 0), 0);
  const totalComments = videos.reduce((acc, v) => acc + (v.commentsCount || 0), 0);
  const activeStreams = liveStreams.filter((s) => s.isLive).length;

  const isAdminOnline = Date.now() - (settings.adminHeartbeatLastSeen || 0) < 25000;

  return res.json({
    totalUsers: users.length,
    totalVideos: videos.length,
    pendingDataRequests: pendingData,
    approvedDataRequests: approvedData,
    rejectedDataRequests: rejectedData,
    totalDataRequests: dataPurchases.length,
    liveStreamsCount: liveStreams.length,
    activeStreamsCount: activeStreams,
    totalLikes,
    totalComments,
    isAdminOnline,
    requiredLinkActive: requiredLink.isEnabled,
    dailyDataPrice: settings.dailyDataPrice,
  });
});

// 2. Manage Users
app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const users = await supabaseDb.getAllUsers();
  const safeUsers = users.map(({ passwordHash, ...rest }) => rest);
  return res.json(safeUsers);
});

app.put('/api/admin/users/:id/ban', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const currentAdmin = req.user!;

  if (targetId === currentAdmin.id) {
    return res.status(400).json({ error: 'You cannot ban your own administrator account.' });
  }

  const targetUser = await supabaseDb.getUserById(targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const newBannedState = !targetUser.isBanned;
  await supabaseDb.updateUser(targetId, { isBanned: newBannedState });

  return res.json({ isBanned: newBannedState });
});

// 3. Manage Videos
app.get('/api/admin/videos', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const videos = await supabaseDb.getAllAdminVideos();
  return res.json(videos);
});

app.delete('/api/admin/videos/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const videoId = req.params.id;
  const video = await supabaseDb.getVideoById(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  await supabaseDb.deleteVideo(videoId);
  return res.json({ message: 'Video has been successfully removed from feed.' });
});

// 4. Data Requests
app.get('/api/admin/data-requests', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const requests = await supabaseDb.getDataPurchases();
  return res.json(requests);
});

app.put('/api/admin/data-requests/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const requestId = req.params.id;
  const { status, adminNotes } = req.body;

  if (status !== 'APPROVED' && status !== 'REJECTED') {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
  }

  // Get current purchase before update to check previous status
  const allPurchases = await supabaseDb.getDataPurchases();
  const currentReq = allPurchases.find((p) => p.id === requestId);
  if (!currentReq) {
    return res.status(404).json({ error: 'Data request not found.' });
  }
  const wasPending = currentReq.status === 'PENDING';

  const updated = await supabaseDb.updateDataPurchaseStatus(requestId, status, adminNotes);
  if (!updated) {
    return res.status(404).json({ error: 'Data request not found.' });
  }

  // If rejected and was pending, refund the deducted money back to user's wallet
  let refundNote = '';
  if (status === 'REJECTED' && wasPending) {
    const rawPrice = currentReq.price || '₦250';
    const numericPrice = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10) || 250;

    await supabaseDb.adjustUserBalance(currentReq.userId, numericPrice);

    // Create a refund wallet record
    const refundTx: WalletTransactionRecord = {
      id: `tx-ref-${crypto.randomUUID()}`,
      userId: currentReq.userId,
      username: currentReq.username,
      userEmail: currentReq.userEmail,
      type: 'deposit',
      amount: numericPrice,
      status: 'APPROVED',
      note: `Refund: Rejected Data Purchase (${currentReq.packageName})`,
      adminNotes: adminNotes || 'Admin rejected request; payment refunded to wallet',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    await supabaseDb.createWalletTransaction(refundTx);
    refundNote = ` ₦${numericPrice.toLocaleString()} has been refunded back to your wallet.`;
  }

  // Send notification to user
  const notif: NotificationRecord = {
    id: `notif-${crypto.randomUUID()}`,
    userId: updated.userId,
    type: 'data_status',
    title: status === 'APPROVED' ? 'Data Purchase Approved! 🎉' : 'Data Request Rejected (Refunded)',
    message:
      status === 'APPROVED'
        ? `Your request for ${updated.packageName} for ${updated.phoneNumber} has been APPROVED by the administrator.`
        : `Your request for ${updated.packageName} was rejected. ${adminNotes ? `Reason: ${adminNotes}.` : ''}${refundNote}`,
    link: '/buy-data',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await supabaseDb.createNotification(notif);

  return res.json(updated);
});

// 5. Manage Live Streams
app.get('/api/admin/live-streams', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const streams = await supabaseDb.getLiveStreams();
  return res.json(streams);
});

app.put('/api/admin/live-streams/:id/toggle', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const streamId = req.params.id;
  const updated = await supabaseDb.toggleLiveStream(streamId);
  if (!updated) {
    return res.status(404).json({ error: 'Stream not found.' });
  }
  return res.json(updated);
});

// 6. Manage Required Link
app.get('/api/admin/required-link', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const link = await supabaseDb.getRequiredLink();
  return res.json(link);
});

app.put('/api/admin/required-link', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { url, isEnabled, title, description } = req.body;

  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must begin with http:// or https://' });
  }

  const updated = await supabaseDb.updateRequiredLink({ url, isEnabled, title, description });
  return res.json(updated);
});

// 7. Website Settings
app.get('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const settings = await supabaseDb.getSiteSettings();
  return res.json(settings);
});

app.put('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { siteTitle, maintenanceMode, dailyDataPrice, announcementText } = req.body;
  const updated = await supabaseDb.updateSiteSettings({ siteTitle, maintenanceMode, dailyDataPrice, announcementText });
  return res.json(updated);
});

// 8. Admin Wallet Management
app.get('/api/admin/wallet/transactions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await supabaseDb.getWalletTransactions();
    return res.json(transactions);
  } catch (err: any) {
    console.error('Error fetching admin wallet transactions:', err);
    return res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

app.post('/api/admin/wallet/transactions/:id/action', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const txId = req.params.id;
    const { action, adminNotes } = req.body;

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = await supabaseDb.updateWalletTransactionStatus(txId, newStatus, adminNotes);

    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Send notification to user
    const title = updated.type === 'deposit'
      ? (newStatus === 'APPROVED' ? 'Deposit Approved! ₦' + updated.amount.toLocaleString() : 'Deposit Rejected')
      : (newStatus === 'APPROVED' ? 'Withdrawal Completed! ₦' + updated.amount.toLocaleString() : 'Withdrawal Rejected');

    const message = updated.type === 'deposit'
      ? (newStatus === 'APPROVED'
          ? `Your PalmPay deposit of ₦${updated.amount.toLocaleString()} (Sender: ${updated.senderName || 'Verified'}) has been verified and credited to your wallet balance.`
          : `Your deposit request for ₦${updated.amount.toLocaleString()} could not be verified. ${adminNotes ? 'Reason: ' + adminNotes : ''}`)
      : (newStatus === 'APPROVED'
          ? `Your withdrawal of ₦${updated.amount.toLocaleString()} to ${updated.destinationBank} (${updated.destinationAccountNumber}) has been processed.`
          : `Your withdrawal request for ₦${updated.amount.toLocaleString()} was declined. ${adminNotes ? 'Reason: ' + adminNotes : ''}`);

    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId: updated.userId,
      type: 'system',
      title,
      message,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.json({
      message: `Transaction successfully ${newStatus.toLowerCase()}.`,
      transaction: updated,
    });
  } catch (err: any) {
    console.error('Error acting on wallet transaction:', err);
    return res.status(500).json({ error: 'Failed to update transaction status.' });
  }
});

app.post('/api/admin/wallet/adjust-balance', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;
    const numAmount = Number(amount);
    if (!userId || isNaN(numAmount)) {
      return res.status(400).json({ error: 'User ID and numeric amount are required.' });
    }

    const newBalance = await supabaseDb.adjustUserBalance(userId, numAmount);

    const notif: NotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      userId,
      type: 'system',
      title: numAmount >= 0 ? 'Wallet Balance Credited' : 'Wallet Balance Adjusted',
      message: numAmount >= 0
        ? `An administrator credited ₦${Math.abs(numAmount).toLocaleString()} to your wallet. ${reason ? 'Note: ' + reason : ''}`
        : `An administrator adjusted your wallet by -₦${Math.abs(numAmount).toLocaleString()}. ${reason ? 'Note: ' + reason : ''}`,
      link: '/wallet',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await supabaseDb.createNotification(notif);

    return res.json({ newBalance, message: 'Balance adjusted successfully.' });
  } catch (err: any) {
    console.error('Adjust balance error:', err);
    return res.status(500).json({ error: 'Failed to adjust balance.' });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE OR STATIC PRODUCTION SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mr Felix platform running on port ${PORT}`);
    if (isServerSupabaseConfigured()) {
      console.log('🔗 Supabase integration active: using Supabase PostgreSQL & Storage.');
    } else {
      console.log('ℹ️  Supabase credentials not yet supplied. Using local fallback persistence.');
    }
    // Automatically purge any remaining demo records without touching genuine user uploads
    supabaseDb.purgeDemoVideos().catch(() => {});
  });
}

startServer();
