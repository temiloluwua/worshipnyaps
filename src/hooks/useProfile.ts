import { useState, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface ExtendedProfile extends UserProfile {
  cover_photo_url?: string;
  interests?: string[];
  location_text?: string;
  stats?: {
    posts_count: number;
    connections_count: number;
    likes_received: number;
  };
}

export const useProfile = () => {
  const { user, profile: currentUserProfile } = useAuth();
  const [viewingProfile, setViewingProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<ExtendedProfile | null> => {
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!profileData) return null;

      const { count: postsCount } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId);

      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      const { data: userTopics } = await supabase
        .from('topics')
        .select('id')
        .eq('author_id', userId);

      let likesReceived = 0;
      if (userTopics && userTopics.length > 0) {
        const topicIds = userTopics.map(t => t.id);
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('likeable_type', 'topic')
          .in('likeable_id', topicIds);
        likesReceived = count || 0;
      }

      const extendedProfile: ExtendedProfile = {
        ...profileData,
        stats: {
          posts_count: postsCount || 0,
          connections_count: connectionsCount || 0,
          likes_received: likesReceived
        }
      };

      setViewingProfile(extendedProfile);
      return extendedProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<ExtendedProfile>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          bio: updates.bio,
          avatar_url: updates.avatar_url,
          cover_photo_url: updates.cover_photo_url,
          interests: updates.interests,
          location_text: updates.location_text,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated!');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return false;
    }
  }, [user]);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      return null;
    }
  }, [user]);

  const uploadCoverPhoto = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-cover-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await supabase
        .from('users')
        .update({ cover_photo_url: publicUrl })
        .eq('id', user.id);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast.error('Failed to upload cover photo');
      return null;
    }
  }, [user]);

  const fetchUserPosts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          users!topics_author_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  }, []);

  const fetchUserLikedPosts = useCallback(async (userId: string) => {
    try {
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('likeable_id')
        .eq('user_id', userId)
        .eq('likeable_type', 'topic')
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likes || likes.length === 0) return [];

      const topicIds = likes.map(l => l.likeable_id);

      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select(`
          *,
          users!topics_author_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .in('id', topicIds);

      if (topicsError) throw topicsError;

      const orderedTopics = topicIds
        .map(id => topics?.find(t => t.id === id))
        .filter(t => t !== undefined);

      return orderedTopics;
    } catch (error) {
      console.error('Error fetching liked posts:', error);
      return [];
    }
  }, []);

  return {
    viewingProfile,
    loading,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    uploadCoverPhoto,
    fetchUserPosts,
    fetchUserLikedPosts
  };
};
