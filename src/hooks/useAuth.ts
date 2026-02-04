import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
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

  return {
    user,
    session,
    profile,
    loading,
    signOut,
  };
}