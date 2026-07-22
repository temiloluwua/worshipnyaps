import { useState, useEffect, useCallback } from 'react';
import { supabase, CommunityPost } from '../lib/supabase';
import { useAuth } from './useAuth';
import { fetchBlockedIds } from '../lib/blocking';
import toast from 'react-hot-toast';

export const useCommunityPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          users!community_posts_author_id_fkey (
            id,
            name,
            avatar_url,
            city
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      const blocked = await fetchBlockedIds(user?.id);
      const visible = ((data || []) as CommunityPost[]).filter(p => !blocked.has(p.author_id));
      setPosts(visible);
    } catch (error) {
      console.error('Error fetching community posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createPost = useCallback(async (postData: {
    title: string;
    content?: string;
    tags?: string[];
    image_url?: string;
    bible_verse?: string;
    community_category?: CommunityPost['community_category'];
    visibility?: CommunityPost['visibility'];
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: user.id,
          title: postData.title,
          content: postData.content,
          tags: postData.tags || [],
          image_url: postData.image_url,
          bible_verse: postData.bible_verse,
          community_category: postData.community_category,
          visibility: postData.visibility || 'public',
          is_pinned: false,
          view_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPosts();
      return data;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  }, [user, fetchPosts]);

  const updatePost = useCallback(async (
    postId: string,
    updates: Partial<Pick<CommunityPost, 'title' | 'content' | 'tags' | 'image_url' | 'bible_verse' | 'community_category' | 'visibility' | 'is_pinned'>>
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post updated');
      await fetchPosts();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  }, [user, fetchPosts]);

  // Staff-only: flip is_featured so the post shows in the Search "Featured"
  // rail. RLS rejects the update for non-staff, so the toast will surface
  // the auth failure if a non-staff user somehow triggers it.
  const toggleFeatured = useCallback(async (postId: string, makeFeatured: boolean) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({
          is_featured: makeFeatured,
          featured_at: makeFeatured ? new Date().toISOString() : null,
          featured_by: makeFeatured ? user.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);
      if (error) throw error;
      toast.success(makeFeatured ? 'Post featured on Search' : 'Removed from Featured');
      await fetchPosts();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update featured state');
      return false;
    }
  }, [user, fetchPosts]);

  const fetchFeaturedPosts = useCallback(async (limit = 5): Promise<CommunityPost[]> => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          users!community_posts_author_id_fkey (id, name, avatar_url, city)
        `)
        .eq('is_featured', true)
        .order('featured_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as CommunityPost[];
    } catch (err) {
      console.error('Error fetching featured posts:', err);
      return [];
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      await fetchPosts();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  }, [user, fetchPosts]);

  const getPostComments = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_author_id_fkey (
            name,
            avatar_url
          )
        `)
        .eq('community_post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, []);

  const addComment = useCallback(async (postId: string, content: string, parentId?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          community_post_id: postId,
          author_id: user.id,
          content,
          parent_id: parentId,
        })
        .select(`
          *,
          users!comments_author_id_fkey (
            name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    toggleFeatured,
    fetchFeaturedPosts,
    getPostComments,
    addComment,
  };
};
