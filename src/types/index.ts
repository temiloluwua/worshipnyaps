export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'host' | 'admin';
  isApproved: boolean;
  avatar?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  hostId: string;
  isApproved: boolean;
}

export interface Event {
  id: string;
  title: string;
  type: 'bible-study' | 'basketball-yap' | 'hiking-yap' | 'other';
  description: string;
  date: string;
  time: string;
  locationId: string;
  hostId: string;
  capacity: number;
  attendees: string[];
  isPrivate: boolean;
  inviteCode?: string;
  roles: {
    worship: {
      leaderId?: string;
      musicians: string[];
      setList: string[];
    };
    discussion: {
      leaderId?: string;
    };
    hospitality: {
      coordinatorId?: string;
      foodItems: FoodItem[];
    };
    prayer: {
      leaderId?: string;
    };
  };
}

export interface FoodItem {
  id: string;
  item: string;
  assignedTo?: string;
  completed: boolean;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  createdAt: string;
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'general' | 'event' | 'connection_request' | 'volunteer_opportunity';
  title: string;
  message: string;
  event_id?: string;
  is_read: boolean;
  created_at: string;
}