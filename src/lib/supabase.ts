import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase configuration. Some features may not work.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
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
  is_verified?: boolean;
  avatar_url?: string;
  bio?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface DescriptionTemplate {
  whatToExpect?: string;
  whatToBring?: string[];
  parkingDirections?: string;
  contactInfo?: string;
  specialNotes?: string;
}

export interface Event {
  id: string;
  title: string;
  type: 'bible-study' | 'basketball-yap' | 'hiking-yap' | 'other';
  description: string;
  description_template?: DescriptionTemplate;
  date: string;
  time: string;
  location_id: string;
  host_id: string;
  capacity: number;
  attendees?: number;
  is_private: boolean;
  visibility: 'public' | 'private' | 'friends_only';
  address_visibility?: 'general_area' | 'attendees_only' | 'public';
  area_lat?: number | null;
  area_lng?: number | null;
  event_type?: 'bible_study' | 'yap';
  study_topic?: string;
  session_purpose?: string;
  location_type?: 'home' | 'church' | 'park' | 'cafe' | 'online';
  opening_ritual?: string;
  closing_ritual?: string;
  guest_covenant?: string;
  yap_vibe?: string;
  bring_note?: string;
  invite_code?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
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

export type CommunityCategory = 'prayer_point' | 'testimony' | 'bible_study' | 'question' | 'general';

export interface Topic {
  id: string;
  title: string;
  category: string;
  community_category?: CommunityCategory;
  content: string;
  author_id: string;
  tags: string[];
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  questions?: string[];
  bibleReference?: string;
  bible_verse?: string;
  users?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CommunityPost {
  id: string;
  author_id: string;
  title: string;
  content?: string;
  tags: string[];
  image_url?: string;
  bible_verse?: string;
  community_category?: CommunityCategory;
  visibility: 'public' | 'friends_only';
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
    city?: string;
  };
}

export interface EventHelpRequest {
  id: string;
  event_id: string;
  request_type: 'prayer' | 'worship' | 'tech' | 'discussion' | 'hospitality' | 'food' | 'setup' | 'other';
  title: string;
  description?: string;
  status: 'open' | 'filled' | 'in_progress';
  assigned_user_id?: string;
  created_at: string;
  assigned_user?: {
    name: string;
    avatar_url?: string;
  };
}

export interface TopicRequest {
  id: string;
  title: string;
  description?: string;
  bible_verse?: string;
  category: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
  requester?: {
    name: string;
    avatar_url?: string;
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

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id?: string;
  channel: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  responded_at?: string;
  event?: Event;
  inviter?: UserProfile;
}
