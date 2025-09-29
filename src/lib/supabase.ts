import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://pobqjupcbhhkvparuszr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test connection
console.log('Supabase client initialized:', supabaseUrl);

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connected successfully. Session:', data.session ? 'Active' : 'None');
  }
});

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
  bible_verse?: string;
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
