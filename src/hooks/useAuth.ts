import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setSentryUser } from '../lib/sentry';

interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  is_approved: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Supabase fires both auth.getSession() (below) and the initial
  // onAuthStateChange callback on mount, each of which calls
  // fetchProfile() with the same user id. That duplicate `users?id=...`
  // request on every pageload is what Sentry flagged as an N+1 API call
  // (JAVASCRIPT-REACT-3). Track the last-fetched id so the second call
  // is a no-op instead of firing a redundant request.
  const fetchedProfileIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchedProfileIdRef.current === userId) return;
    fetchedProfileIdRef.current = userId;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch profile:', error);
      // Allow a retry on the next call (e.g. a subsequent auth event)
      // since this attempt didn't actually populate the profile.
      fetchedProfileIdRef.current = null;
      return;
    }
    setProfile(data);
  };

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setSentryUser(currentSession?.user ? { id: currentSession.user.id, email: currentSession.user.email } : null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setSentryUser(currentSession?.user ? { id: currentSession.user.id, email: currentSession.user.email } : null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    deleteAccount,
  };
}