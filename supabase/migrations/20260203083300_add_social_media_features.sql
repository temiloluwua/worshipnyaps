/*
  # Add Social Media Features - Core Tables

  1. New Tables
    - `likes` - Tracks user likes on topics and comments
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `likeable_type` (text) - 'topic' or 'comment'
      - `likeable_id` (uuid) - ID of the liked item
      - `created_at` (timestamptz)
    
    - `reactions` - Emoji reactions on content
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `target_type` (text) - 'topic', 'comment', or 'message'
      - `target_id` (uuid)
      - `reaction_type` (text) - 'love', 'pray', 'celebrate', 'amen', 'thinking'
      - `created_at` (timestamptz)
    
    - `bookmarks` - User saved topics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `topic_id` (uuid, references topics)
      - `created_at` (timestamptz)
    
    - `reposts` - Reposted topics with optional quote
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `original_topic_id` (uuid, references topics)
      - `quote_text` (text, optional)
      - `created_at` (timestamptz)
    
    - `hashtags` - Hashtag registry
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `usage_count` (integer)
      - `created_at` (timestamptz)
    
    - `hashtag_follows` - Users following hashtags
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `hashtag_id` (uuid, references hashtags)
      - `created_at` (timestamptz)
    
    - `activity_feed` - User activity stream
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User who performed the action
      - `activity_type` (text) - 'like', 'comment', 'repost', 'follow', 'reaction'
      - `target_id` (uuid)
      - `target_type` (text)
      - `target_user_id` (uuid) - User who owns the target content
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Profile Enhancements
    - Add `cover_photo_url`, `interests`, `location_text` to users table

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for authenticated users
*/

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  likeable_type text NOT NULL CHECK (likeable_type IN ('topic', 'comment')),
  likeable_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS likes_user_item_unique ON likes(user_id, likeable_type, likeable_id);
CREATE INDEX IF NOT EXISTS likes_likeable_idx ON likes(likeable_type, likeable_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('topic', 'comment', 'message')),
  target_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('love', 'pray', 'celebrate', 'amen', 'thinking')),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_target_unique ON reactions(user_id, target_type, target_id, reaction_type);
CREATE INDEX IF NOT EXISTS reactions_target_idx ON reactions(target_type, target_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_topic_unique ON bookmarks(user_id, topic_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks(user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reposts table
CREATE TABLE IF NOT EXISTS reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  quote_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reposts_user_idx ON reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_original_idx ON reposts(original_topic_id);

ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reposts"
  ON reposts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own reposts"
  ON reposts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reposts"
  ON reposts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hashtags_name_idx ON hashtags(name);
CREATE INDEX IF NOT EXISTS hashtags_usage_idx ON hashtags(usage_count DESC);

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hashtags"
  ON hashtags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create hashtags"
  ON hashtags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update hashtag counts"
  ON hashtags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Hashtag follows table
CREATE TABLE IF NOT EXISTS hashtag_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hashtag_follows_unique ON hashtag_follows(user_id, hashtag_id);

ALTER TABLE hashtag_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hashtag follows"
  ON hashtag_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow hashtags"
  ON hashtag_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow hashtags"
  ON hashtag_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('like', 'comment', 'repost', 'follow', 'reaction', 'mention', 'post')),
  target_id uuid,
  target_type text,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_feed_user_idx ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS activity_feed_target_user_idx ON activity_feed(target_user_id);
CREATE INDEX IF NOT EXISTS activity_feed_created_idx ON activity_feed(created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities involving them"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create own activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add profile enhancement columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cover_photo_url'
  ) THEN
    ALTER TABLE users ADD COLUMN cover_photo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'interests'
  ) THEN
    ALTER TABLE users ADD COLUMN interests text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'location_text'
  ) THEN
    ALTER TABLE users ADD COLUMN location_text text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio text;
  END IF;
END $$;

-- Add image_url to topics for media sharing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE topics ADD COLUMN image_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics' AND column_name = 'images'
  ) THEN
    ALTER TABLE topics ADD COLUMN images text[] DEFAULT '{}';
  END IF;
END $$;