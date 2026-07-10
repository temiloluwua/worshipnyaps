import { useState, useEffect } from 'react';
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

  const fetchProfile = async (userId: string) => {
    // On a brand-new OAuth (Google/Apple) sign-up, the public.users row is
    // created by the handle_new_user trigger a beat after the auth user
    // exists. The auth listener fires once, so if we fetch before the trigger
    // commits we'd get null and never onboard. Retry a few times to catch it.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Failed to fetch profile:', error);
        return;
      }
      if (data) {
        setProfile(data);
        return;
      }
      // No row yet — wait and retry (250ms, 500ms, 750ms).
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
    setProfile(null);
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