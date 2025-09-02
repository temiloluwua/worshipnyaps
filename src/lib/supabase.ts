import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://pobqjupcbhhkvparuszr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYnFqdXBjYmhoa3ZwYXJ1c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNzE0OTIsImV4cCI6MjA3MTc0NzQ5Mn0.hCh19K0sWa-3eemAxe5PXaOJYdBHAWOXGZJcrBkcEFA';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
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
});

// Test connection
console.log('Supabase client initialized:', supabaseUrl);

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
