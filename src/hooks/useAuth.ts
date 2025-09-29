import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: Session check:', session ? 'Found' : 'None');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('useAuth: Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('useAuth: Profile fetch error:', error);
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createProfile(userId);
          return;
        }
        throw error;
      }
      console.log('useAuth: Profile loaded:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't show error toast on initial load
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      console.log('Creating profile for user:', userId);
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: authUser.user.email!,
          name: authUser.user.user_metadata?.name || 'New User',
          phone: authUser.user.user_metadata?.phone,
          role: 'member',
          is_approved: true,
        });

      if (error) throw error;
      console.log('Profile created successfully');
      await fetchProfile(userId);
    } catch (error) {
      console.error('Error creating profile:', error);
      // Don't show error toast as this might be expected in some cases
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign up user:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
          emailRedirectTo: undefined, // Disable email confirmation for now
        },
      });

      if (error) throw error;
      console.log('Sign up successful:', data);
      toast.success('Account created successfully!');
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in user:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      console.log('Sign in successful:', data);
      toast.success('Signed in successfully!');
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Attempting Google sign in...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      console.log('Google sign in initiated:', data);
      // Note: The actual sign-in happens via redirect, so we don't show success toast here
      return { data, error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
  };
};