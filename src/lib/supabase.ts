import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  throw new Error('Supabase configuration is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'worship-and-yapps',
    },
  },
});

// Test connection with better error handling
export const testConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1).maybeSingle();
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    console.log('Supabase client initialized successfully:', supabaseUrl);
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return false;
  }
};

// Database types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'member' | 'host' | 'admin';
  is_approved: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  type: 'bible-study' | 'basketball-yap' | 'hiking-yap' | 'other';
  description: string;
  date: string;
  time: string;
  location_id: string;
  host_id: string;
  capacity: number;
  attendees?: number;
  is_private: boolean;
  invite_code?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined table data
  locations?: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'attended' | 'cancelled';
  registered_at: string;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  content: string;
  author_id: string;
  tags: string[];
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Additional properties for UI components
  questions?: string[];
  bibleReference?: string;
  // Joined table data
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Comment {
  id: string;
  topic_id: string;
  author_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'active' | 'blocked';
  connected_at: string;
  notes?: string;
  met_at_event_id?: string;
}

export interface ConnectionRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  event_id?: string;
  created_at: string;
  responded_at?: string;
}
