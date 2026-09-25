import { getSupabaseServerClient, isServerSupabaseConfigured } from './supabase.ts';
import {
  db,
  UserRecord,
  VideoRecord,
  CommentRecord,
  LikeRecord,
  FollowRecord,
  DataPurchaseRecord,
  LiveStreamRecord,
  LiveChatMessageRecord,
  NotificationRecord,
  RequiredLinkConfig,
  AdminSettingsRecord,
  TypingScoreRecord,
  WalletTransactionRecord,
  StorageItemRecord,
  VideoGiftRecord,
  VideoAccessRecord,
  PALMPAY_DEPOSIT_CONFIG,
} from './db.ts';

export const supabaseDb = {
  isConfigured: () => isServerSupabaseConfigured(),

  // ----------------------------------------------------
  // USERS & PROFILES
  // ----------------------------------------------------
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (!isServerSupabaseConfigured()) {
      const users = db.get('users');
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()) || null;
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(`email.ilike.${email},username.ilike.${email}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const localUser = db.get('users').find((u) => u.id === data.id || u.email.toLowerCase() === data.email.toLowerCase());
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      role: data.role,
      avatarUrl: data.avatar_url || '',
      bio: data.bio || '',
      followersCount: data.followers_count || 0,
      followingCount: data.following_count || 0,
      likesReceivedCount: data.likes_received_count || 0,
      createdAt: data.created_at || new Date().toISOString(),
      isBanned: data.is_banned || false,
      walletBalance: data.wallet_balance !== undefined ? Number(data.wallet_balance) : (localUser?.walletBalance || 0),
    };
  },

  async getUserById(id: string): Promise<UserRecord | null> {
    const isIdAdmin = id.toLowerCase() === 'admin' || id === 'usr-admin-felix';

    if (!isServerSupabaseConfigured()) {
      const users = db.get('users');
      const found = users.find(
        (u) =>
          u.id === id ||
          u.username.toLowerCase() === id.toLowerCase() ||
          (isIdAdmin && (u.role === 'admin' || u.username === 'mrfelix_admin'))
      );
      if (found) return found;
      if (isIdAdmin && users.length > 0) return users[0];
      return null;
    }

    const client = getSupabaseServerClient()!;
    let query = client.from('profiles').select('*');

    if (isIdAdmin) {
      query = query.or('role.eq.admin,username.ilike.mrfelix_admin,id.eq.usr-admin-felix');
    } else {
      query = query.or(`id.eq.${id},username.ilike.${id}`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      if (isIdAdmin) {
        const { data: firstProfile } = await client.from('profiles').select('*').limit(1).maybeSingle();
        if (firstProfile) {
          const localAdmin = db.get('users').find((u) => u.id === firstProfile.id || u.email.toLowerCase() === firstProfile.email.toLowerCase());
          return {
            id: firstProfile.id,
            email: firstProfile.email,
            username: firstProfile.username,
            role: firstProfile.role,
            avatarUrl: firstProfile.avatar_url || '',
            bio: firstProfile.bio || '',
            followersCount: firstProfile.followers_count || 0,
            followingCount: firstProfile.following_count || 0,
            likesReceivedCount: firstProfile.likes_received_count || 0,
            createdAt: firstProfile.created_at || new Date().toISOString(),
            isBanned: firstProfile.is_banned || false,
            walletBalance: firstProfile.wallet_balance !== undefined ? Number(firstProfile.wallet_balance) : (localAdmin?.walletBalance || 0),
          };
        }
      }
      return null;
    }

    const localUserMatch = db.get('users').find((u) => u.id === data.id || u.email.toLowerCase() === data.email.toLowerCase());
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      role: data.role,
      avatarUrl: data.avatar_url || '',
      bio: data.bio || '',
      followersCount: data.followers_count || 0,
      followingCount: data.following_count || 0,
      likesReceivedCount: data.likes_received_count || 0,
      createdAt: data.created_at || new Date().toISOString(),
      isBanned: data.is_banned || false,
      walletBalance: data.wallet_balance !== undefined ? Number(data.wallet_balance) : (localUserMatch?.walletBalance || 0),
    };
  },

  async getAllUsers(): Promise<UserRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db.get('users');
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((d) => {
      const local = db.get('users').find((u) => u.id === d.id);
      return {
        id: d.id,
        email: d.email,
        username: d.username,
        role: d.role,
        avatarUrl: d.avatar_url || '',
        bio: d.bio || '',
        followersCount: d.followers_count || 0,
        followingCount: d.following_count || 0,
        likesReceivedCount: d.likes_received_count || 0,
        createdAt: d.created_at || new Date().toISOString(),
        isBanned: d.is_banned || false,
        walletBalance: d.wallet_balance !== undefined ? Number(d.wallet_balance) : (local?.walletBalance || 0),
      };
    });
  },

  async createUser(user: UserRecord): Promise<UserRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('users', (prev) => [...prev, user]);
      return user;
    }

    const client = getSupabaseServerClient()!;
    const { error } = await client.from('profiles').insert({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      followers_count: user.followersCount || 0,
      following_count: user.followingCount || 0,
      likes_received_count: user.likesReceivedCount || 0,
      is_banned: user.isBanned || false,
      created_at: user.createdAt,
    });

    if (error) {
      console.error('Supabase createUser error:', error);
    }
    return user;
  },

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<void> {
    if (!isServerSupabaseConfigured()) {
      const users = db.get('users');
      const u = users.find((usr) => usr.id === id);
      if (u) {
        Object.assign(u, updates);
        db.persist();
      }
      return;
    }

    const client = getSupabaseServerClient()!;
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.isBanned !== undefined) payload.is_banned = updates.isBanned;
    if (updates.followersCount !== undefined) payload.followers_count = updates.followersCount;
    if (updates.followingCount !== undefined) payload.following_count = updates.followingCount;
    if (updates.likesReceivedCount !== undefined) payload.likes_received_count = updates.likesReceivedCount;

    await client.from('profiles').update(payload).eq('id', id);
  },

  // ----------------------------------------------------
  // VIDEOS
  // ----------------------------------------------------
  async getVideos(options: { shuffle?: boolean; currentUserId?: string } = {}): Promise<VideoRecord[]> {
    if (!isServerSupabaseConfigured()) {
      const all = db.get('videos').filter((v) => !v.isRemoved);
      let list = [...all];
      if (options.shuffle && list.length > 1) {
        const idx = Math.floor(Math.random() * list.length);
        list = [...list.slice(idx), ...list.slice(0, idx)];
      }
      return list;
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client
      .from('videos')
      .select('*')
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    let list: VideoRecord[] = data.map((v) => ({
      id: v.id,
      creatorId: v.creator_id,
      creatorUsername: v.creator_username,
      creatorAvatar: v.creator_avatar,
      title: v.title,
      description: v.description,
      videoUrl: v.video_url,
      posterUrl: v.poster_url,
      musicTitle: v.music_title,
      tags: v.tags || ['MrFelix'],
      likesCount: v.likes_count || 0,
      commentsCount: v.comments_count || 0,
      sharesCount: v.shares_count || 0,
      duration: v.duration || 15,
      createdAt: v.created_at,
      isRemoved: v.is_removed || false,
      isSeasonal: v.is_seasonal || false,
      seasonalCategory: v.seasonal_category || undefined,
      visibility: v.visibility || 'public',
      viewingPrice: Number(v.viewing_price) || 0,
    }));

    if (options.shuffle && list.length > 1) {
      const idx = Math.floor(Math.random() * list.length);
      list = [...list.slice(idx), ...list.slice(0, idx)];
    }
    return list;
  },

  async getAllAdminVideos(): Promise<VideoRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db.get('videos');
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client.from('videos').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((v) => ({
      id: v.id,
      creatorId: v.creator_id,
      creatorUsername: v.creator_username,
      creatorAvatar: v.creator_avatar,
      title: v.title,
      description: v.description,
      videoUrl: v.video_url,
      posterUrl: v.poster_url,
      musicTitle: v.music_title,
      tags: v.tags || ['MrFelix'],
      likesCount: v.likes_count || 0,
      commentsCount: v.comments_count || 0,
      sharesCount: v.shares_count || 0,
      duration: v.duration || 15,
      createdAt: v.created_at,
      isRemoved: v.is_removed || false,
      isSeasonal: v.is_seasonal || false,
      seasonalCategory: v.seasonal_category || undefined,
    }));
  },

  async createVideo(video: VideoRecord): Promise<VideoRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('videos', (prev) => [video, ...prev]);
      return video;
    }

    const client = getSupabaseServerClient()!;
    const insertPayload: any = {
      id: video.id,
      creator_id: video.creatorId,
      user_id: video.creatorId,
      creator_username: video.creatorUsername,
      creator_avatar: video.creatorAvatar,
      title: video.title,
      description: video.description,
      video_url: video.videoUrl,
      storage_path: video.storagePath || null,
      poster_url: video.posterUrl,
      thumbnail_url: video.posterUrl,
      music_title: video.musicTitle,
      tags: video.tags,
      views: video.views || 0,
      likes_count: video.likesCount || 0,
      comments_count: video.commentsCount || 0,
      shares_count: video.sharesCount || 0,
      duration: video.duration || 15,
      is_removed: video.isRemoved || false,
      is_seasonal: video.isSeasonal || false,
      seasonal_category: video.seasonalCategory || null,
      visibility: video.visibility || 'public',
      viewing_price: video.viewingPrice || 0,
      created_at: video.createdAt,
      updated_at: video.createdAt,
    };

    const { error } = await client.from('videos').insert(insertPayload);

    if (error) {
      console.error('Supabase createVideo error:', error);
      throw new Error(`Failed to save video record in Supabase: ${error.message}`);
    }
    return video;
  },

  async getVideoById(id: string): Promise<VideoRecord | null> {
    if (!isServerSupabaseConfigured()) {
      return db.get('videos').find((v) => v.id === id) || null;
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client.from('videos').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      creatorId: data.creator_id || data.user_id,
      creatorUsername: data.creator_username,
      creatorAvatar: data.creator_avatar,
      title: data.title,
      description: data.description,
      videoUrl: data.video_url,
      storagePath: data.storage_path,
      posterUrl: data.poster_url || data.thumbnail_url,
      musicTitle: data.music_title,
      tags: data.tags || [],
      views: data.views || 0,
      likesCount: data.likes_count || 0,
      commentsCount: data.comments_count || 0,
      sharesCount: data.shares_count || 0,
      duration: data.duration || 15,
      createdAt: data.created_at,
      isRemoved: data.is_removed || false,
      isSeasonal: data.is_seasonal || false,
      seasonalCategory: data.seasonal_category,
      visibility: data.visibility || 'public',
      viewingPrice: Number(data.viewing_price) || 0,
    };
  },

  async deleteVideo(id: string): Promise<void> {
    if (!isServerSupabaseConfigured()) {
      const v = db.get('videos').find((item) => item.id === id);
      if (v) {
        v.isRemoved = true;
        db.persist();
      }
      return;
    }

    const client = getSupabaseServerClient()!;
    // Clean up Supabase Storage file if exists
    try {
      const { data: v } = await client.from('videos').select('storage_path').eq('id', id).maybeSingle();
      if (v?.storage_path) {
        await client.storage.from('videos').remove([v.storage_path]);
      }
    } catch (stErr) {
      console.warn('Storage cleanup notice on video delete:', stErr);
    }

    await client.from('videos').update({ is_removed: true }).eq('id', id);
  },

  async incrementVideoShare(id: string): Promise<number> {
    if (!isServerSupabaseConfigured()) {
      const v = db.get('videos').find((item) => item.id === id);
      if (v) {
        v.sharesCount = (v.sharesCount || 0) + 1;
        db.persist();
        return v.sharesCount;
      }
      return 0;
    }

    const client = getSupabaseServerClient()!;
    const current = await this.getVideoById(id);
    const newShares = (current?.sharesCount || 0) + 1;
    await client.from('videos').update({ shares_count: newShares }).eq('id', id);
    return newShares;
  },

  // ----------------------------------------------------
  // LIKES & FOLLOWS
  // ----------------------------------------------------
  async hasUserLikedVideo(videoId: string, userId: string): Promise<boolean> {
    if (!isServerSupabaseConfigured()) {
      return db.get('likes').some((l) => l.videoId === videoId && l.userId === userId);
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client
      .from('likes')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  },

  async toggleVideoLike(videoId: string, userId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    if (!isServerSupabaseConfigured()) {
      const video = db.get('videos').find((v) => v.id === videoId);
      if (!video) throw new Error('Video not found');
      const likes = db.get('likes');
      const idx = likes.findIndex((l) => l.videoId === videoId && l.userId === userId);
      let isLiked = false;
      if (idx > -1) {
        likes.splice(idx, 1);
        video.likesCount = Math.max(0, (video.likesCount || 0) - 1);
        isLiked = false;
      } else {
        likes.push({ id: `lik-${Date.now()}`, videoId, userId, createdAt: new Date().toISOString() });
        video.likesCount = (video.likesCount || 0) + 1;
        isLiked = true;
      }
      db.persist();
      return { isLiked, likesCount: video.likesCount };
    }

    const client = getSupabaseServerClient()!;
    const isLiked = await this.hasUserLikedVideo(videoId, userId);
    const video = await this.getVideoById(videoId);
    let newLikes = video?.likesCount || 0;

    if (isLiked) {
      await client.from('likes').delete().eq('video_id', videoId).eq('user_id', userId);
      newLikes = Math.max(0, newLikes - 1);
    } else {
      await client.from('likes').insert({
        video_id: videoId,
        user_id: userId,
      });
      newLikes = newLikes + 1;
    }

    await client.from('videos').update({ likes_count: newLikes }).eq('id', videoId);
    return { isLiked: !isLiked, likesCount: newLikes };
  },

  async isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
    if (!isServerSupabaseConfigured()) {
      return db.get('follows').some((f) => f.followerId === followerId && f.followingId === followingId);
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  },

  async toggleUserFollow(followerId: string, followingId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    if (!isServerSupabaseConfigured()) {
      const follows = db.get('follows');
      const idx = follows.findIndex((f) => f.followerId === followerId && f.followingId === followingId);
      const targetUser = db.get('users').find((u) => u.id === followingId);
      const currentUser = db.get('users').find((u) => u.id === followerId);
      let isFollowing = false;
      if (idx > -1) {
        follows.splice(idx, 1);
        if (targetUser) targetUser.followersCount = Math.max(0, (targetUser.followersCount || 0) - 1);
        if (currentUser) currentUser.followingCount = Math.max(0, (currentUser.followingCount || 0) - 1);
        isFollowing = false;
      } else {
        follows.push({ id: `flw-${Date.now()}`, followerId, followingId, createdAt: new Date().toISOString() });
        if (targetUser) targetUser.followersCount = (targetUser.followersCount || 0) + 1;
        if (currentUser) currentUser.followingCount = (currentUser.followingCount || 0) + 1;
        isFollowing = true;
      }
      db.persist();
      return { isFollowing, followersCount: targetUser?.followersCount || 0 };
    }

    const client = getSupabaseServerClient()!;
    const isFollowing = await this.isFollowingUser(followerId, followingId);
    const targetUser = await this.getUserById(followingId);
    let newFollowers = targetUser?.followersCount || 0;

    if (isFollowing) {
      await client.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
      newFollowers = Math.max(0, newFollowers - 1);
    } else {
      await client.from('follows').insert({ follower_id: followerId, following_id: followingId });
      newFollowers = newFollowers + 1;
    }

    await client.from('profiles').update({ followers_count: newFollowers }).eq('id', followingId);
    return { isFollowing: !isFollowing, followersCount: newFollowers };
  },

  // ----------------------------------------------------
  // COMMENTS
  // ----------------------------------------------------
  async getComments(videoId: string): Promise<CommentRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db
        .get('comments')
        .filter((c) => c.videoId === videoId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((c) => ({
      id: c.id,
      videoId: c.video_id,
      userId: c.user_id,
      username: c.username,
      userAvatar: c.user_avatar,
      content: c.content,
      createdAt: c.created_at,
    }));
  },

  async createComment(comment: CommentRecord): Promise<CommentRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('comments', (prev) => [comment, ...prev]);
      const v = db.get('videos').find((vid) => vid.id === comment.videoId);
      if (v) {
        v.commentsCount = (v.commentsCount || 0) + 1;
        db.persist();
      }
      return comment;
    }

    const client = getSupabaseServerClient()!;
    await client.from('comments').insert({
      id: comment.id,
      video_id: comment.videoId,
      user_id: comment.userId,
      username: comment.username,
      user_avatar: comment.userAvatar,
      content: comment.content,
      created_at: comment.createdAt,
    });

    const video = await this.getVideoById(comment.videoId);
    if (video) {
      await client.from('videos').update({ comments_count: (video.commentsCount || 0) + 1 }).eq('id', comment.videoId);
    }
    return comment;
  },

  // ----------------------------------------------------
  // DATA PURCHASES
  // ----------------------------------------------------
  async getDataPurchases(userId?: string): Promise<DataPurchaseRecord[]> {
    if (!isServerSupabaseConfigured()) {
      const all = db.get('dataPurchases');
      if (userId) {
        return all.filter((p) => p.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const client = getSupabaseServerClient()!;
    let query = client.from('data_purchases').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      username: d.username,
      userEmail: d.user_email,
      phoneNumber: d.phone_number,
      packageId: d.package_id,
      packageName: d.package_name,
      price: d.price,
      status: d.status,
      createdAt: d.created_at,
      approvedAt: d.approved_at,
      adminNotes: d.admin_notes,
    }));
  },

  async createDataPurchase(purchase: DataPurchaseRecord): Promise<DataPurchaseRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('dataPurchases', (prev) => [purchase, ...prev]);
      return purchase;
    }

    const client = getSupabaseServerClient()!;
    await client.from('data_purchases').insert({
      id: purchase.id,
      user_id: purchase.userId,
      username: purchase.username,
      user_email: purchase.userEmail,
      phone_number: purchase.phoneNumber,
      package_id: purchase.packageId,
      package_name: purchase.packageName,
      price: purchase.price,
      status: purchase.status,
      created_at: purchase.createdAt,
    });
    return purchase;
  },

  async updateDataPurchaseStatus(id: string, status: 'APPROVED' | 'REJECTED', adminNotes?: string): Promise<DataPurchaseRecord | null> {
    if (!isServerSupabaseConfigured()) {
      const list = db.get('dataPurchases');
      const item = list.find((p) => p.id === id);
      if (item) {
        item.status = status;
        item.approvedAt = new Date().toISOString();
        if (adminNotes) item.adminNotes = adminNotes;
        db.persist();
        return item;
      }
      return null;
    }

    const client = getSupabaseServerClient()!;
    const approvedAt = new Date().toISOString();
    const payload: any = { status, approved_at: approvedAt };
    if (adminNotes) payload.admin_notes = adminNotes;

    const { data, error } = await client.from('data_purchases').update(payload).eq('id', id).select().maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      username: data.username,
      userEmail: data.user_email,
      phoneNumber: data.phone_number,
      packageId: data.package_id,
      packageName: data.package_name,
      price: data.price,
      status: data.status,
      createdAt: data.created_at,
      approvedAt: data.approved_at,
      adminNotes: data.admin_notes,
    };
  },

  // ----------------------------------------------------
  // LIVE STREAMS & CHAT
  // ----------------------------------------------------
  async getLiveStreams(): Promise<LiveStreamRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db.get('liveStreams');
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client.from('live_streams').select('*').order('started_at', { ascending: false });
    if (error || !data) return [];
    return data.map((s) => ({
      id: s.id,
      creatorId: s.creator_id,
      creatorUsername: s.creator_username,
      creatorAvatar: s.creator_avatar,
      title: s.title,
      category: s.category,
      viewerCount: s.viewer_count || 1,
      isLive: s.is_live,
      startedAt: s.started_at,
      streamKey: s.stream_key,
      endpointUrl: s.endpoint_url,
      previewImage: s.preview_image,
    }));
  },

  async createLiveStream(stream: LiveStreamRecord): Promise<LiveStreamRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('liveStreams', (prev) => [stream, ...prev]);
      return stream;
    }

    const client = getSupabaseServerClient()!;
    await client.from('live_streams').insert({
      id: stream.id,
      creator_id: stream.creatorId,
      creator_username: stream.creatorUsername,
      creator_avatar: stream.creatorAvatar,
      title: stream.title,
      category: stream.category,
      viewer_count: stream.viewerCount || 1,
      is_live: stream.isLive,
      started_at: stream.startedAt,
      stream_key: stream.streamKey,
      endpoint_url: stream.endpointUrl,
      preview_image: stream.previewImage,
    });
    return stream;
  },

  async toggleLiveStream(id: string): Promise<LiveStreamRecord | null> {
    if (!isServerSupabaseConfigured()) {
      const list = db.get('liveStreams');
      const item = list.find((s) => s.id === id);
      if (item) {
        item.isLive = !item.isLive;
        db.persist();
        return item;
      }
      return null;
    }

    const client = getSupabaseServerClient()!;
    const current = (await this.getLiveStreams()).find((s) => s.id === id);
    if (!current) return null;
    const { data } = await client.from('live_streams').update({ is_live: !current.isLive }).eq('id', id).select().maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      creatorId: data.creator_id,
      creatorUsername: data.creator_username,
      creatorAvatar: data.creator_avatar,
      title: data.title,
      category: data.category,
      viewerCount: data.viewer_count || 1,
      isLive: data.is_live,
      startedAt: data.started_at,
      streamKey: data.stream_key,
      endpointUrl: data.endpoint_url,
      previewImage: data.preview_image,
    };
  },

  async getLiveChat(streamId: string): Promise<LiveChatMessageRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db.get('liveChatMessages').filter((m) => m.streamId === streamId);
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client.from('live_chat_messages').select('*').eq('stream_id', streamId).order('timestamp', { ascending: true });
    if (!data) return [];
    return data.map((m) => ({
      id: m.id,
      streamId: m.stream_id,
      userId: m.user_id,
      username: m.username,
      userAvatar: m.user_avatar,
      message: m.message,
      timestamp: m.timestamp,
    }));
  },

  async createLiveChatMessage(msg: LiveChatMessageRecord): Promise<LiveChatMessageRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('liveChatMessages', (prev) => [...prev, msg]);
      return msg;
    }

    const client = getSupabaseServerClient()!;
    await client.from('live_chat_messages').insert({
      id: msg.id,
      stream_id: msg.streamId,
      user_id: msg.userId,
      username: msg.username,
      user_avatar: msg.userAvatar,
      message: msg.message,
      timestamp: msg.timestamp,
    });
    return msg;
  },

  // ----------------------------------------------------
  // TYPING SPEED TEST
  // ----------------------------------------------------
  async getTypingLeaderboard(): Promise<TypingScoreRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return [...db.get('typingScores')].sort((a, b) => b.wpm - a.wpm).slice(0, 15);
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client.from('typing_scores').select('*').order('wpm', { ascending: false }).limit(15);
    if (!data) return [];
    return data.map((t) => ({
      id: t.id,
      userId: t.user_id,
      username: t.username,
      durationSeconds: t.duration_seconds,
      wordsTyped: t.words_typed,
      correctWords: t.correct_words,
      incorrectWords: t.incorrect_words,
      accuracy: Number(t.accuracy),
      wpm: t.wpm,
      timeUsed: t.time_used,
      completedAt: t.completed_at,
    }));
  },

  async createTypingScore(score: TypingScoreRecord): Promise<TypingScoreRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('typingScores', (prev) => [score, ...prev]);
      return score;
    }

    const client = getSupabaseServerClient()!;
    await client.from('typing_scores').insert({
      id: score.id,
      user_id: score.userId || null,
      username: score.username,
      duration_seconds: score.durationSeconds,
      words_typed: score.wordsTyped,
      correct_words: score.correctWords,
      incorrect_words: score.incorrectWords,
      accuracy: score.accuracy,
      wpm: score.wpm,
      time_used: score.timeUsed,
      completed_at: score.completedAt,
    });
    return score;
  },

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  async getNotifications(userId: string): Promise<NotificationRecord[]> {
    if (!isServerSupabaseConfigured()) {
      return db
        .get('notifications')
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!data) return [];
    return data.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.created_at,
    }));
  },

  async createNotification(notif: NotificationRecord): Promise<void> {
    if (!isServerSupabaseConfigured()) {
      db.update('notifications', (prev) => [notif, ...prev]);
      return;
    }

    const client = getSupabaseServerClient()!;
    await client.from('notifications').insert({
      id: notif.id,
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link,
      read: notif.read,
      created_at: notif.createdAt,
    });
  },

  async markNotificationRead(id: string, userId: string): Promise<void> {
    if (!isServerSupabaseConfigured()) {
      const notif = db.get('notifications').find((n) => n.id === id && n.userId === userId);
      if (notif) {
        notif.read = true;
        db.persist();
      }
      return;
    }

    const client = getSupabaseServerClient()!;
    await client.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (!isServerSupabaseConfigured()) {
      const list = db.get('notifications');
      list.forEach((n) => {
        if (n.userId === userId) n.read = true;
      });
      db.persist();
      return;
    }

    const client = getSupabaseServerClient()!;
    await client.from('notifications').update({ read: true }).eq('user_id', userId);
  },

  // ----------------------------------------------------
  // REQUIRED LINK & SETTINGS
  // ----------------------------------------------------
  async getRequiredLink(): Promise<RequiredLinkConfig> {
    if (!isServerSupabaseConfigured()) {
      return db.get('requiredLink');
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client.from('required_link').select('*').limit(1).maybeSingle();
    if (!data) return db.get('requiredLink');
    return {
      id: data.id,
      url: data.url,
      isEnabled: data.is_enabled,
      title: data.title,
      description: data.description,
      updatedAt: data.updated_at,
    };
  },

  async updateRequiredLink(updates: Partial<RequiredLinkConfig>): Promise<RequiredLinkConfig> {
    if (!isServerSupabaseConfigured()) {
      const curr = db.get('requiredLink');
      const updated = { ...curr, ...updates, updatedAt: new Date().toISOString() };
      db.set('requiredLink', updated);
      return updated;
    }

    const client = getSupabaseServerClient()!;
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.url !== undefined) payload.url = updates.url;
    if (updates.isEnabled !== undefined) payload.is_enabled = updates.isEnabled;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;

    const { data } = await client.from('required_link').update(payload).eq('id', 'req-link-1').select().maybeSingle();
    if (!data) return this.getRequiredLink();
    return {
      id: data.id,
      url: data.url,
      isEnabled: data.is_enabled,
      title: data.title,
      description: data.description,
      updatedAt: data.updated_at,
    };
  },

  async getSiteSettings(): Promise<AdminSettingsRecord> {
    if (!isServerSupabaseConfigured()) {
      return db.get('settings');
    }

    const client = getSupabaseServerClient()!;
    const { data } = await client.from('site_settings').select('*').limit(1).maybeSingle();
    if (!data) return db.get('settings');
    return {
      siteTitle: data.site_title,
      adminHeartbeatLastSeen: Number(data.admin_heartbeat_last_seen || 0),
      maintenanceMode: data.maintenance_mode,
      dailyDataPrice: data.daily_data_price,
      announcementText: data.announcement_text,
    };
  },

  async updateSiteSettings(updates: Partial<AdminSettingsRecord>): Promise<AdminSettingsRecord> {
    if (!isServerSupabaseConfigured()) {
      const curr = db.get('settings');
      const updated = { ...curr, ...updates };
      db.set('settings', updated);
      return updated;
    }

    const client = getSupabaseServerClient()!;
    const payload: any = {};
    if (updates.siteTitle !== undefined) payload.site_title = updates.siteTitle;
    if (updates.maintenanceMode !== undefined) payload.maintenance_mode = updates.maintenanceMode;
    if (updates.dailyDataPrice !== undefined) payload.daily_data_price = updates.dailyDataPrice;
    if (updates.announcementText !== undefined) payload.announcement_text = updates.announcementText;
    if (updates.adminHeartbeatLastSeen !== undefined) payload.admin_heartbeat_last_seen = updates.adminHeartbeatLastSeen;

    const { data } = await client.from('site_settings').update(payload).eq('id', 'global-settings').select().maybeSingle();
    if (!data) return this.getSiteSettings();
    return {
      siteTitle: data.site_title,
      adminHeartbeatLastSeen: Number(data.admin_heartbeat_last_seen || 0),
      maintenanceMode: data.maintenance_mode,
      dailyDataPrice: data.daily_data_price,
      announcementText: data.announcement_text,
    };
  },

  async recordHeartbeat(): Promise<number> {
    const timestamp = Date.now();
    await this.updateSiteSettings({ adminHeartbeatLastSeen: timestamp });
    return timestamp;
  },

  async purgeDemoVideos(): Promise<{ deleted: number }> {
    const demoIds = [
      'vid-1', 'vid-2', 'vid-3', 'vid-4', 'vid-5', 'vid-6',
      'vid-7', 'vid-8', 'vid-9', 'vid-10', 'vid-11', 'vid-12'
    ];
    if (!isServerSupabaseConfigured()) {
      db.update('videos', (prev) => prev.filter((v) => !demoIds.includes(v.id)));
      return { deleted: demoIds.length };
    }

    try {
      const client = getSupabaseServerClient()!;
      await client.from('videos').delete().in('id', demoIds);
    } catch (err: any) {
      console.warn('Notice while ensuring demo video records are removed:', err?.message);
    }
    return { deleted: demoIds.length };
  },

  // ----------------------------------------------------
  // WALLET OPERATIONS
  // ----------------------------------------------------
  async getWalletData(userId: string): Promise<{
    balance: number;
    currency: string;
    earningsFromVideos: number;
    earningsFromGifts: number;
    totalEarnings: number;
    transactions: WalletTransactionRecord[];
    depositBankDetails: typeof PALMPAY_DEPOSIT_CONFIG;
  }> {
    const user = await this.getUserById(userId);
    const balance = user?.walletBalance || 0;
    const transactions = await this.getWalletTransactions(userId);

    // Calculate earnings breakdown from transactions
    let earningsFromVideos = 0;
    let earningsFromGifts = 0;
    for (const tx of transactions) {
      if (tx.status === 'APPROVED') {
        if (tx.note?.includes('Video Unlock') || tx.note?.includes('Paid Video')) {
          earningsFromVideos += tx.amount;
        } else if (tx.note?.includes('Gift received') || tx.note?.includes('Video Gift')) {
          earningsFromGifts += tx.amount;
        }
      }
    }

    return {
      balance,
      currency: 'NGN',
      earningsFromVideos,
      earningsFromGifts,
      totalEarnings: earningsFromVideos + earningsFromGifts,
      transactions,
      depositBankDetails: PALMPAY_DEPOSIT_CONFIG,
    };
  },

  async getWalletTransactions(userId?: string): Promise<WalletTransactionRecord[]> {
    if (!isServerSupabaseConfigured()) {
      const all = db.get('walletTransactions') || [];
      if (userId) {
        return all
          .filter((t) => t.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    try {
      const client = getSupabaseServerClient()!;
      let query = client.from('wallet_transactions').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error || !data) {
        const all = db.get('walletTransactions') || [];
        return userId ? all.filter((t) => t.userId === userId) : all;
      }
      return data.map((t) => ({
        id: t.id,
        userId: t.user_id,
        username: t.username,
        userEmail: t.user_email,
        type: t.type,
        amount: Number(t.amount),
        status: t.status,
        senderName: t.sender_name,
        bankName: t.bank_name,
        accountNumber: t.account_number,
        accountName: t.account_name,
        screenshotUrl: t.screenshot_url,
        destinationBank: t.destination_bank,
        destinationAccountNumber: t.destination_account_number,
        destinationAccountName: t.destination_account_name,
        note: t.note,
        adminNotes: t.admin_notes,
        createdAt: t.created_at,
        processedAt: t.processed_at,
      }));
    } catch {
      const all = db.get('walletTransactions') || [];
      return userId ? all.filter((t) => t.userId === userId) : all;
    }
  },

  async createWalletTransaction(tx: WalletTransactionRecord): Promise<WalletTransactionRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('walletTransactions', (prev) => [tx, ...(prev || [])]);
      return tx;
    }

    try {
      const client = getSupabaseServerClient()!;
      await client.from('wallet_transactions').insert({
        id: tx.id,
        user_id: tx.userId,
        username: tx.username,
        user_email: tx.userEmail,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        sender_name: tx.senderName,
        bank_name: tx.bankName,
        account_number: tx.accountNumber,
        account_name: tx.accountName,
        screenshot_url: tx.screenshotUrl,
        destination_bank: tx.destinationBank,
        destination_account_number: tx.destinationAccountNumber,
        destination_account_name: tx.destinationAccountName,
        note: tx.note,
        admin_notes: tx.adminNotes,
        created_at: tx.createdAt,
      });
    } catch (err) {
      console.warn('Supabase wallet_transactions table insert fallback to local db:', err);
    }
    db.update('walletTransactions', (prev) => [tx, ...(prev || [])]);
    return tx;
  },

  async updateWalletTransactionStatus(
    txId: string,
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string
  ): Promise<WalletTransactionRecord | null> {
    const transactions = db.get('walletTransactions') || [];
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return null;

    const previousStatus = tx.status;
    tx.status = status;
    tx.processedAt = new Date().toISOString();
    if (adminNotes !== undefined) tx.adminNotes = adminNotes;

    // If approving deposit: credit user balance!
    if (status === 'APPROVED' && previousStatus !== 'APPROVED') {
      if (tx.type === 'deposit') {
        await this.adjustUserBalance(tx.userId, tx.amount);
      } else if (tx.type === 'withdrawal') {
        // Debit user balance on withdrawal approval
        await this.adjustUserBalance(tx.userId, -tx.amount);
      }
    } else if (status === 'REJECTED' && previousStatus === 'APPROVED') {
      // Revert if previously approved
      if (tx.type === 'deposit') {
        await this.adjustUserBalance(tx.userId, -tx.amount);
      } else if (tx.type === 'withdrawal') {
        await this.adjustUserBalance(tx.userId, tx.amount);
      }
    }

    db.persist();

    if (isServerSupabaseConfigured()) {
      try {
        const client = getSupabaseServerClient()!;
        await client.from('wallet_transactions').update({
          status,
          processed_at: tx.processedAt,
          admin_notes: tx.adminNotes,
        }).eq('id', txId);
      } catch (err) {
        console.warn('Supabase update wallet_transactions notice:', err);
      }
    }

    return tx;
  },

  async adjustUserBalance(userId: string, amount: number): Promise<number> {
    const users = db.get('users');
    const u = users.find((x) => x.id === userId);
    let newBalance = 0;
    if (u) {
      u.walletBalance = Math.max(0, (u.walletBalance || 0) + amount);
      newBalance = u.walletBalance;
      db.persist();
    }
    if (isServerSupabaseConfigured()) {
      try {
        const client = getSupabaseServerClient()!;
        await client.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
      } catch (err) {
        console.warn('Supabase balance sync notice:', err);
      }
    }
    return newBalance;
  },

  // ----------------------------------------------------
  // EXPLORER STORAGE ITEMS (videos, photos, audio, links, notes)
  // ----------------------------------------------------
  async getStorageItems(options: { userId?: string; currentUserId?: string; visibility?: 'public' | 'private' } = {}): Promise<StorageItemRecord[]> {
    if (!isServerSupabaseConfigured()) {
      let items = db.get('storageItems') || [];
      if (options.userId) {
        items = items.filter((i) => i.userId === options.userId);
      }
      if (options.visibility) {
        items = items.filter((i) => i.visibility === options.visibility);
      } else if (options.currentUserId) {
        // Return public items OR items owned by current user
        items = items.filter((i) => i.visibility === 'public' || i.userId === options.currentUserId);
      } else {
        items = items.filter((i) => i.visibility === 'public');
      }
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const client = getSupabaseServerClient()!;
    let query = client.from('storage_items').select('*').order('created_at', { ascending: false });

    if (options.userId) {
      query = query.eq('user_id', options.userId);
      if (options.visibility) {
        query = query.eq('visibility', options.visibility);
      } else if (options.currentUserId && options.currentUserId === options.userId) {
        // Own profile: can view both public and private
      } else {
        // Other user profile: public only
        query = query.eq('visibility', 'public');
      }
    } else {
      if (options.visibility) {
        query = query.eq('visibility', options.visibility);
      } else if (options.currentUserId) {
        query = query.or(`visibility.eq.public,user_id.eq.${options.currentUserId}`);
      } else {
        query = query.eq('visibility', 'public');
      }
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn('Error querying storage_items from Supabase:', error?.message);
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      username: d.username,
      userAvatar: d.user_avatar,
      type: d.type,
      title: d.title,
      description: d.description || '',
      fileUrl: d.file_url || '',
      storagePath: d.storage_path || '',
      linkUrl: d.link_url || '',
      textContent: d.text_content || '',
      visibility: d.visibility || 'private',
      createdAt: d.created_at,
    }));
  },

  async createStorageItem(item: StorageItemRecord): Promise<StorageItemRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('storageItems', (prev) => [item, ...(prev || [])]);
      return item;
    }

    const client = getSupabaseServerClient()!;
    const insertPayload = {
      id: item.id,
      user_id: item.userId,
      username: item.username,
      user_avatar: item.userAvatar || '',
      type: item.type,
      title: item.title,
      description: item.description || '',
      file_url: item.fileUrl || '',
      storage_path: item.storagePath || '',
      link_url: item.linkUrl || '',
      text_content: item.textContent || '',
      visibility: item.visibility,
      created_at: item.createdAt,
    };

    const { error } = await client.from('storage_items').insert(insertPayload);
    if (error) {
      console.error('Supabase createStorageItem error:', error);
      throw new Error(`Failed to save storage item in Supabase: ${error.message}`);
    }
    return item;
  },

  async deleteStorageItem(id: string, requesterUserId: string, isAdmin = false): Promise<boolean> {
    if (!isServerSupabaseConfigured()) {
      const items = db.get('storageItems') || [];
      const index = items.findIndex((x) => x.id === id);
      if (index === -1) return false;
      const item = items[index];
      if (item.userId !== requesterUserId && !isAdmin) return false;
      items.splice(index, 1);
      db.persist();
      return true;
    }

    const client = getSupabaseServerClient()!;
    const { data: item } = await client.from('storage_items').select('*').eq('id', id).maybeSingle();
    if (!item) return false;
    if (item.user_id !== requesterUserId && !isAdmin) return false;

    // Delete associated storage object if present
    if (item.storage_path) {
      try {
        await client.storage.from('storage_files').remove([item.storage_path]);
      } catch (err) {
        console.warn('Storage file deletion notice:', err);
      }
    }

    const { error } = await client.from('storage_items').delete().eq('id', id);
    return !error;
  },

  // ----------------------------------------------------
  // VIDEO ACCESS & PAY-TO-WATCH
  // ----------------------------------------------------
  async hasUserPaidForVideo(userId: string, videoId: string): Promise<boolean> {
    if (!userId || !videoId) return false;
    if (!isServerSupabaseConfigured()) {
      const accesses = db.get('videoAccess') || [];
      return accesses.some((a) => a.userId === userId && a.videoId === videoId && a.status === 'successful');
    }

    const client = getSupabaseServerClient()!;
    const { data, error } = await client
      .from('video_access')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .eq('status', 'successful')
      .maybeSingle();

    if (error) {
      console.warn('Supabase video_access query error:', error.message);
      return false;
    }
    return !!data;
  },

  async recordVideoAccess(access: VideoAccessRecord): Promise<VideoAccessRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('videoAccess', (prev) => [access, ...(prev || [])]);
      return access;
    }

    const client = getSupabaseServerClient()!;
    const insertPayload = {
      id: access.id,
      user_id: access.userId,
      video_id: access.videoId,
      creator_id: access.creatorId,
      amount_paid: access.amountPaid,
      payment_reference: access.paymentReference,
      status: access.status,
      unlocked_at: access.unlockedAt,
    };

    const { error } = await client.from('video_access').upsert(insertPayload);
    if (error) {
      console.error('Supabase recordVideoAccess error:', error);
      throw new Error(`Failed to record video access: ${error.message}`);
    }
    return access;
  },

  // ----------------------------------------------------
  // VIDEO GIFTS
  // ----------------------------------------------------
  async recordVideoGift(gift: VideoGiftRecord): Promise<VideoGiftRecord> {
    if (!isServerSupabaseConfigured()) {
      db.update('videoGifts', (prev) => [gift, ...(prev || [])]);
      return gift;
    }

    const client = getSupabaseServerClient()!;
    const insertPayload = {
      id: gift.id,
      sender_id: gift.senderId,
      sender_username: gift.senderUsername,
      sender_avatar: gift.senderAvatar || '',
      creator_id: gift.creatorId,
      creator_username: gift.creatorUsername,
      video_id: gift.videoId,
      video_title: gift.videoTitle || '',
      amount: gift.amount,
      payment_reference: gift.paymentReference,
      payment_status: gift.paymentStatus,
      created_at: gift.createdAt,
    };

    const { error } = await client.from('video_gifts').insert(insertPayload);
    if (error) {
      console.error('Supabase recordVideoGift error:', error);
      throw new Error(`Failed to record video gift: ${error.message}`);
    }
    return gift;
  },

  async getVideoGifts(videoId?: string, creatorId?: string): Promise<VideoGiftRecord[]> {
    if (!isServerSupabaseConfigured()) {
      let gifts = db.get('videoGifts') || [];
      if (videoId) gifts = gifts.filter((g) => g.videoId === videoId);
      if (creatorId) gifts = gifts.filter((g) => g.creatorId === creatorId);
      return gifts;
    }

    const client = getSupabaseServerClient()!;
    let query = client.from('video_gifts').select('*').order('created_at', { ascending: false });
    if (videoId) query = query.eq('video_id', videoId);
    if (creatorId) query = query.eq('creator_id', creatorId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((g) => ({
      id: g.id,
      senderId: g.sender_id,
      senderUsername: g.sender_username,
      senderAvatar: g.sender_avatar,
      creatorId: g.creator_id,
      creatorUsername: g.creator_username,
      videoId: g.video_id,
      videoTitle: g.video_title,
      amount: Number(g.amount) || 0,
      paymentReference: g.payment_reference,
      paymentStatus: g.payment_status,
      createdAt: g.created_at,
    }));
  },
};
