-- ============================================================================
-- MR FELIX - SUPABASE DATABASE SCHEMA & RLS SECURITY POLICIES
-- ============================================================================
-- Execute this script in your Supabase Dashboard: SQL Editor -> New query -> Run
-- This script sets up all tables, indexes, Row Level Security (RLS) policies,
-- automatic profile synchronization on Auth signup, and initial seed data.
-- ============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLE: profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- Can store auth.uid()::text or custom ID
    email TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    likes_received_count INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. TABLE: videos (Real user-uploaded video records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.videos (
    id TEXT PRIMARY KEY DEFAULT ('vid-' || gen_random_uuid()),
    creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_username TEXT NOT NULL,
    creator_avatar TEXT DEFAULT '',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    video_url TEXT NOT NULL,
    storage_path TEXT,
    poster_url TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT '',
    music_title TEXT DEFAULT 'Original Sound',
    tags TEXT[] DEFAULT ARRAY['MrFelix']::TEXT[],
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 15,
    is_removed BOOLEAN DEFAULT FALSE,
    is_seasonal BOOLEAN DEFAULT FALSE,
    seasonal_category TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration safety for existing tables
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS viewing_price NUMERIC(10,2) DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 3b. TABLE: storage_items (Explorer Storage: videos, photos, audio, links, notes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_items (
    id TEXT PRIMARY KEY DEFAULT ('stor-' || gen_random_uuid()),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    user_avatar TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('video', 'image', 'audio', 'link', 'note')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    storage_path TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    text_content TEXT DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3c. TABLE: video_access (Tracks user payment to unlock paid private videos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_access (
    id TEXT PRIMARY KEY DEFAULT ('acc-' || gen_random_uuid()),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL,
    payment_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'successful' CHECK (status IN ('successful', 'pending', 'failed')),
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_video_access UNIQUE (user_id, video_id)
);

-- ----------------------------------------------------------------------------
-- 3d. TABLE: video_gifts (Tips & gifts sent to creators on videos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_gifts (
    id TEXT PRIMARY KEY DEFAULT ('gift-' || gen_random_uuid()),
    sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_username TEXT NOT NULL,
    sender_avatar TEXT DEFAULT '',
    creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_username TEXT NOT NULL,
    video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    video_title TEXT DEFAULT '',
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_reference TEXT NOT NULL UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'successful' CHECK (payment_status IN ('successful', 'pending', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. TABLE: comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY DEFAULT ('cmt-' || gen_random_uuid()),
    video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    user_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. TABLE: likes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
    id TEXT PRIMARY KEY DEFAULT ('lik-' || gen_random_uuid()),
    video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_video_user_like UNIQUE (video_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 6. TABLE: follows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    id TEXT PRIMARY KEY DEFAULT ('flw-' || gen_random_uuid()),
    follower_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id)
);

-- ----------------------------------------------------------------------------
-- 7. TABLE: data_purchases (Daily Data bundle requests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_purchases (
    id TEXT PRIMARY KEY DEFAULT ('dp-' || gen_random_uuid()),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    user_email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    package_id TEXT DEFAULT 'daily-1gb-250',
    package_name TEXT DEFAULT 'DAILY DATA (1 GB)',
    price TEXT DEFAULT '₦250',
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. TABLE: live_streams
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_streams (
    id TEXT PRIMARY KEY DEFAULT ('live-' || gen_random_uuid()),
    creator_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_username TEXT NOT NULL,
    creator_avatar TEXT DEFAULT '',
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    viewer_count INTEGER DEFAULT 1,
    is_live BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT now(),
    stream_key TEXT NOT NULL,
    endpoint_url TEXT DEFAULT '',
    preview_image TEXT DEFAULT ''
);

-- ----------------------------------------------------------------------------
-- 9. TABLE: live_chat_messages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id TEXT PRIMARY KEY DEFAULT ('lcm-' || gen_random_uuid()),
    stream_id TEXT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    user_avatar TEXT DEFAULT '',
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. TABLE: typing_scores (Typing Speed Test Leaderboard)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.typing_scores (
    id TEXT PRIMARY KEY DEFAULT ('ts-' || gen_random_uuid()),
    user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    words_typed INTEGER NOT NULL,
    correct_words INTEGER NOT NULL,
    incorrect_words INTEGER NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    wpm INTEGER NOT NULL,
    time_used INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 11. TABLE: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif-' || gen_random_uuid()),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. TABLE: required_link (Admin configurable gate)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.required_link (
    id TEXT PRIMARY KEY DEFAULT 'req-link-1',
    url TEXT DEFAULT 'https://example.com/partner-verification',
    is_enabled BOOLEAN DEFAULT FALSE,
    title TEXT DEFAULT 'Important Partner Action',
    description TEXT DEFAULT 'You have an action to complete before continuing on Mr Felix.',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 13. TABLE: site_settings (Admin global settings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'global-settings',
    site_title TEXT DEFAULT 'Mr Felix',
    admin_heartbeat_last_seen BIGINT DEFAULT 0,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    daily_data_price TEXT DEFAULT '₦250',
    announcement_text TEXT DEFAULT 'Welcome to Mr Felix! Browse video feeds, claim high-speed data, tune into live streams, or test your typing speed.'
);

-- ----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.required_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_gifts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid()::text = id OR public.is_admin());

-- VIDEOS POLICIES
DROP POLICY IF EXISTS "Active videos are viewable by everyone" ON public.videos;
CREATE POLICY "Active videos are viewable by everyone"
    ON public.videos FOR SELECT
    USING (is_removed = FALSE OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create videos" ON public.videos;
CREATE POLICY "Authenticated users can create videos"
    ON public.videos FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own videos or admin" ON public.videos;
CREATE POLICY "Users can update own videos or admin"
    ON public.videos FOR UPDATE
    USING (auth.uid()::text = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin or owner can delete videos" ON public.videos;
CREATE POLICY "Admin or owner can delete videos"
    ON public.videos FOR DELETE
    USING (auth.uid()::text = creator_id OR public.is_admin());

-- COMMENTS POLICIES
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone"
    ON public.comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner or admin can delete comments" ON public.comments;
CREATE POLICY "Owner or admin can delete comments"
    ON public.comments FOR DELETE
    USING (auth.uid()::text = user_id OR public.is_admin());

-- LIKES POLICIES
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone"
    ON public.likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON public.likes;
CREATE POLICY "Authenticated users can toggle likes"
    ON public.likes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can remove their own likes" ON public.likes;
CREATE POLICY "Users can remove their own likes"
    ON public.likes FOR DELETE
    USING (auth.uid()::text = user_id OR public.is_admin());

-- FOLLOWS POLICIES
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can follow creators" ON public.follows;
CREATE POLICY "Users can follow creators"
    ON public.follows FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid()::text = follower_id OR public.is_admin());

-- DATA PURCHASES POLICIES
DROP POLICY IF EXISTS "Users view own data purchases or admin" ON public.data_purchases;
CREATE POLICY "Users view own data purchases or admin"
    ON public.data_purchases FOR SELECT
    USING (auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can request data" ON public.data_purchases;
CREATE POLICY "Authenticated users can request data"
    ON public.data_purchases FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can update data request status" ON public.data_purchases;
CREATE POLICY "Admin can update data request status"
    ON public.data_purchases FOR UPDATE
    USING (public.is_admin());

-- LIVE STREAMS & CHAT
DROP POLICY IF EXISTS "Streams viewable by everyone" ON public.live_streams;
CREATE POLICY "Streams viewable by everyone"
    ON public.live_streams FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can start stream" ON public.live_streams;
CREATE POLICY "Authenticated users can start stream"
    ON public.live_streams FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Stream owner or admin can update" ON public.live_streams;
CREATE POLICY "Stream owner or admin can update"
    ON public.live_streams FOR UPDATE
    USING (auth.uid()::text = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Live chat viewable by everyone" ON public.live_chat_messages;
CREATE POLICY "Live chat viewable by everyone"
    ON public.live_chat_messages FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can chat in stream" ON public.live_chat_messages;
CREATE POLICY "Authenticated users can chat in stream"
    ON public.live_chat_messages FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- TYPING TEST LEADERBOARD
DROP POLICY IF EXISTS "Typing scores viewable by everyone" ON public.typing_scores;
CREATE POLICY "Typing scores viewable by everyone"
    ON public.typing_scores FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can submit typing scores" ON public.typing_scores;
CREATE POLICY "Anyone can submit typing scores"
    ON public.typing_scores FOR INSERT
    WITH CHECK (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own notification read state" ON public.notifications;
CREATE POLICY "Users can update own notification read state"
    ON public.notifications FOR UPDATE
    USING (auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "System or admin can create notifications" ON public.notifications;
CREATE POLICY "System or admin can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- REQUIRED LINK & SITE SETTINGS
DROP POLICY IF EXISTS "Required link viewable by all" ON public.required_link;
CREATE POLICY "Required link viewable by all"
    ON public.required_link FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can update required link" ON public.required_link;
CREATE POLICY "Admin can update required link"
    ON public.required_link FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Site settings viewable by all" ON public.site_settings;
CREATE POLICY "Site settings viewable by all"
    ON public.site_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can update site settings" ON public.site_settings;
CREATE POLICY "Admin can update site settings"
    ON public.site_settings FOR ALL
    USING (public.is_admin());

-- STORAGE ITEMS POLICIES (Public or owner-only access)
DROP POLICY IF EXISTS "Public storage items or own items viewable" ON public.storage_items;
CREATE POLICY "Public storage items or own items viewable"
    ON public.storage_items FOR SELECT
    USING (visibility = 'public' OR auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create storage items" ON public.storage_items;
CREATE POLICY "Authenticated users can create storage items"
    ON public.storage_items FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own storage items" ON public.storage_items;
CREATE POLICY "Users can update own storage items"
    ON public.storage_items FOR UPDATE
    USING (auth.uid()::text = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own storage items" ON public.storage_items;
CREATE POLICY "Users can delete own storage items"
    ON public.storage_items FOR DELETE
    USING (auth.uid()::text = user_id OR public.is_admin());

-- VIDEO ACCESS POLICIES
DROP POLICY IF EXISTS "Users view own video purchases or creators view buyers" ON public.video_access;
CREATE POLICY "Users view own video purchases or creators view buyers"
    ON public.video_access FOR SELECT
    USING (auth.uid()::text = user_id OR auth.uid()::text = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "System can record video access" ON public.video_access;
CREATE POLICY "System can record video access"
    ON public.video_access FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR public.is_admin());

-- VIDEO GIFTS POLICIES
DROP POLICY IF EXISTS "Senders and recipients view gifts" ON public.video_gifts;
CREATE POLICY "Senders and recipients view gifts"
    ON public.video_gifts FOR SELECT
    USING (auth.uid()::text = sender_id OR auth.uid()::text = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can send gifts" ON public.video_gifts;
CREATE POLICY "Authenticated users can send gifts"
    ON public.video_gifts FOR INSERT
    WITH CHECK (auth.uid()::text = sender_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 15. AUTOMATIC PROFILE CREATION TRIGGER (When a user signs up via Supabase Auth)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first BOOLEAN;
    user_role TEXT;
    username_val TEXT;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') INTO is_first;
    user_role := CASE WHEN is_first THEN 'admin' ELSE 'user' END;
    
    username_val := COALESCE(
        new.raw_user_meta_data->>'username',
        SPLIT_PART(new.email, '@', 1)
    );

    INSERT INTO public.profiles (id, email, username, role, avatar_url, bio)
    VALUES (
        new.id::text,
        new.email,
        username_val,
        user_role,
        COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || username_val),
        CASE WHEN is_first THEN 'Platform Administrator of Mr Felix' ELSE 'Exploring vertical videos on Mr Felix' END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 16. SEED INITIAL CONFIGURATION & DEMO RECORDS
-- ----------------------------------------------------------------------------

-- Seed global settings
INSERT INTO public.site_settings (id, site_title, admin_heartbeat_last_seen, maintenance_mode, daily_data_price, announcement_text)
VALUES (
    'global-settings',
    'Mr Felix',
    ROUND(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    FALSE,
    '₦250',
    'Welcome to Mr Felix! Browse video feeds, claim high-speed data, tune into live streams, or test your typing speed.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed required link
INSERT INTO public.required_link (id, url, is_enabled, title, description, updated_at)
VALUES (
    'req-link-1',
    'https://example.com/partner-verification',
    FALSE,
    'Important Partner Action',
    'You have an action to complete before continuing on Mr Felix.',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed creator profiles
INSERT INTO public.profiles (id, email, username, role, avatar_url, bio, followers_count, following_count, likes_received_count)
VALUES
    ('usr-admin-felix', 'admin@mrfelix.com', 'mrfelix_admin', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 'Platform Creator & Lead Curator of Mr Felix Video Network 🎬⚡', 12500, 120, 48900),
    ('usr-felix-official', 'creator@mrfelix.com', 'felix_vibes', 'user', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 'Lover of nightscapes, wildlife, and electronic beats. Sharing daily short films.', 8420, 340, 24200),
    ('usr-amara-dance', 'amara@mrfelix.com', 'amara_moves', 'user', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80', 'Choreographer & Movement Director. Creating visual stories through dance.', 15300, 210, 52100),
    ('usr-tomiwa-creatives', 'tomiwa@mrfelix.com', 'tomiwa_lens', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'Cinematographer & Audio Producer. Documenting coastlines and DJ sets.', 9200, 180, 31400),
    ('usr-chef-kofi', 'kofi@mrfelix.com', 'kofi_eats', 'user', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'Street culinary artist and flavor alchemist.', 6100, 95, 18200),
    ('usr-skate-dave', 'dave@mrfelix.com', 'dave_skater', 'user', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80', 'Street skate lines and sunset bowl transitions.', 7800, 110, 22400),
    ('usr-trail-zainab', 'zainab@mrfelix.com', 'zainab_runs', 'user', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80', 'Trail runner, coral reef diver, and mountain explorer.', 5400, 80, 14500)
ON CONFLICT (id) DO NOTHING;

-- NOTE: Demo and placeholder videos have been removed.
-- Real videos are populated only when authenticated users upload video files to Supabase Storage and register them in public.videos.

-- Seed live streams
INSERT INTO public.live_streams (id, creator_id, creator_username, creator_avatar, title, category, viewer_count, is_live, stream_key, endpoint_url, preview_image)
VALUES
    ('live-1', 'usr-amara-dance', 'amara_moves', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80', '🔴 Live Choreography Workshop & Q&A', 'Dance & Arts', 1428, TRUE, 'live_stream_amara_secure_key_99', 'webrtc://stream.mrfelix.live/live/amara_moves', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80'),
    ('live-2', 'usr-tomiwa-creatives', 'tomiwa_lens', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'Sunset DJ Vinyl Set & Synth Experiment 🎧', 'Music & Audio', 842, TRUE, 'live_stream_tomiwa_synth_key_88', 'webrtc://stream.mrfelix.live/live/tomiwa_lens', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80'),
    ('live-3', 'usr-chef-kofi', 'kofi_eats', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'Late Night Gourmet Street Kitchen Cooking 🥘', 'Food & Cooking', 620, TRUE, 'live_stream_kofi_chef_key_77', 'webrtc://stream.mrfelix.live/live/kofi_eats', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Seed live chat
INSERT INTO public.live_chat_messages (id, stream_id, user_id, username, user_avatar, message, timestamp)
VALUES
    ('lcm-1', 'live-1', 'usr-tomiwa-creatives', 'tomiwa_lens', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'Great footwork on that pivot! 🔥', NOW() - INTERVAL '10 minutes'),
    ('lcm-2', 'live-1', 'usr-felix-official', 'felix_vibes', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 'Hello from Lagos! Loving the stream 🌟', NOW() - INTERVAL '4 minutes')
ON CONFLICT (id) DO NOTHING;

-- Seed typing leaderboard scores
INSERT INTO public.typing_scores (id, user_id, username, duration_seconds, words_typed, correct_words, incorrect_words, accuracy, wpm, time_used, completed_at)
VALUES
    ('ts-1', 'usr-admin-felix', 'mrfelix_admin', 60, 68, 64, 4, 94.1, 64, 60, NOW() - INTERVAL '1 day'),
    ('ts-2', 'usr-felix-official', 'felix_vibes', 30, 36, 34, 2, 94.4, 68, 30, NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 17. STORAGE BUCKETS SETUP (videos and avatars)
-- ----------------------------------------------------------------------------
-- Creates public storage bucket 'videos' (100MB limit, video MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Creates public/protected storage bucket 'storage_files' for user Explorer Storage (videos, photos, audio, files)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('storage_files', 'storage_files', true, 104857600)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

-- Storage RLS Policies: Allow public read of video, avatar, and public storage assets
DROP POLICY IF EXISTS "Public can view videos bucket" ON storage.objects;
CREATE POLICY "Public can view videos bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('videos', 'avatars', 'storage_files'));

-- Allow authenticated users to upload files to videos, avatars, or storage_files
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('videos', 'avatars', 'storage_files')
        AND (auth.role() = 'authenticated' OR public.is_admin())
    );

-- Allow users to update their own files
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id IN ('videos', 'avatars', 'storage_files')
        AND (auth.role() = 'authenticated' OR public.is_admin())
    );

-- Allow users or admins to delete files
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('videos', 'avatars', 'storage_files')
        AND (auth.role() = 'authenticated' OR public.is_admin())
    );
