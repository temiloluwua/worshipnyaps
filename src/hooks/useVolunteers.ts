import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import toast from 'react-hot-toast';

interface VolunteerOpportunity {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  roleType: 'worship' | 'discussion' | 'hospitality' | 'prayer' | 'tech';
  description: string;
  skillsNeeded: string[];
  urgency: 'low' | 'medium' | 'high';
  deadline: string;
  volunteersNeeded: number;
  volunteersSignedUp: number;
  status: 'open' | 'filled' | 'urgent';
  createdBy: string;
  createdAt: string;
  customMessage?: string;
  targetAudience: 'all' | 'experienced' | 'new';
}

interface MyVolunteerRole {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  roleType: 'worship' | 'discussion' | 'hospitality' | 'prayer' | 'tech';
  status: 'pending' | 'confirmed' | 'completed';
  signedUpAt: string;
  notes?: string;
}

export const useVolunteers = () => {
  const { user } = useAuth();
  const { createNotification, sendVolunteerOpportunityNotification } = useNotifications();
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [myVolunteerRoles, setMyVolunteerRoles] = useState<MyVolunteerRole[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    // Initialize with some sample opportunities
    setOpportunities([
      {
        id: '1',
        eventId: 'event-1',
        eventTitle: 'Wednesday Bible Study',
        eventDate: '2025-01-15',
        eventTime: '7:00 PM',
        roleType: 'worship',
        description: 'We need someone to lead worship for our weekly Bible study. This includes selecting 3-4 songs, leading singing, and creating a welcoming atmosphere for our group of 12 people.',
        skillsNeeded: ['Guitar playing', 'Singing', 'Song selection'],
        urgency: 'high',
        deadline: '2025-01-12',
        volunteersNeeded: 1,
        volunteersSignedUp: 0,
        status: 'urgent',
        createdBy: 'host-1',
        createdAt: '2025-01-08T10:00:00Z',
        customMessage: 'This would be perfect for someone who loves leading worship in an intimate setting!',
        targetAudience: 'all'
      },
      {
        id: '2',
        eventId: 'event-2',
        eventTitle: 'Basketball & Yap Session',
        eventDate: '2025-01-16',
        eventTime: '6:30 PM',
        roleType: 'hospitality',
        description: 'Help coordinate snacks and drinks for our basketball and discussion time. This includes setting up refreshments and ensuring everyone feels welcome.',
        skillsNeeded: ['Organization', 'Welcoming personality'],
        urgency: 'medium',
        deadline: '2025-01-14',
        volunteersNeeded: 2,
        volunteersSignedUp: 1,
        status: 'open',
        createdBy: 'host-2',
        createdAt: '2025-01-07T15:30:00Z',
        targetAudience: 'new'
      },
      {
        id: '3',
        eventId: 'event-3',
        eventTitle: 'Sunday Morning Gathering',
        eventDate: '2025-01-19',
        eventTime: '10:00 AM',
        roleType: 'discussion',
        description: 'Lead our discussion on the topic of community and belonging. Guide conversation, ask thoughtful questions, and help everyone participate.',
        skillsNeeded: ['Facilitation', 'Active listening', 'Biblical knowledge'],
        urgency: 'low',
        deadline: '2025-01-17',
        volunteersNeeded: 1,
        volunteersSignedUp: 0,
        status: 'open',
        createdBy: 'host-3',
        createdAt: '2025-01-06T09:00:00Z',
        targetAudience: 'experienced'
      }
    ]);

    // Sample user volunteer roles
    if (user) {
      setMyVolunteerRoles([
        {
          id: 'role-1',
          eventId: 'event-4',
          eventTitle: 'Friday Night Fellowship',
          eventDate: '2025-01-17',
          eventTime: '7:30 PM',
          roleType: 'prayer',
          status: 'confirmed',
          signedUpAt: '3 days ago',
          notes: 'Looking forward to leading opening and closing prayers!'
        }
      ]);
    }
  }, [user]);

  // Sign up for volunteer opportunity
  const signUpForOpportunity = async (opportunityId: string) => {
    if (!user) return false;

    try {
      const opportunity = opportunities.find(o => o.id === opportunityId);
      if (!opportunity) return false;

      // Update opportunity
      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunityId 
            ? { 
                ...opp, 
                volunteersSignedUp: opp.volunteersSignedUp + 1,
                status: opp.volunteersSignedUp + 1 >= opp.volunteersNeeded ? 'filled' : opp.status
              }
            : opp
        )
      );

      // Add to user's volunteer roles
      const newRole: MyVolunteerRole = {
        id: Date.now().toString(),
        eventId: opportunity.eventId,
        eventTitle: opportunity.eventTitle,
        eventDate: opportunity.eventDate,
        eventTime: opportunity.eventTime,
        roleType: opportunity.roleType,
        status: 'pending',
        signedUpAt: 'Just now'
      };

      setMyVolunteerRoles(prev => [newRole, ...prev]);

      // Notify the event host
      await createNotification(
        opportunity.createdBy,
        'volunteer_opportunity',
        'New Volunteer Sign-up!',
        `Someone just signed up to help with ${opportunity.roleType} for ${opportunity.eventTitle}`,
        opportunity.eventId
      );

      return true;
    } catch (error) {
      console.error('Error signing up for opportunity:', error);
      return false;
    }
  };

  // Create new volunteer opportunity
  const createOpportunity = async (opportunityData: Partial<VolunteerOpportunity>) => {
    if (!user) return null;

    try {
      const newOpportunity: VolunteerOpportunity = {
        id: Date.now().toString(),
        ...opportunityData,
        volunteersSignedUp: 0,
        status: 'open',
        createdBy: user.id,
        createdAt: new Date().toISOString()
      } as VolunteerOpportunity;

      setOpportunities(prev => [newOpportunity, ...prev]);

      // Send notifications based on target audience
      if (opportunityData.sendNotifications) {
        await sendVolunteerOpportunityNotification(
          opportunityData.eventTitle || 'Event',
          opportunityData.roleType || 'volunteer',
          opportunityData.eventId || ''
        );
      }

      return newOpportunity;
    } catch (error) {
      console.error('Error creating opportunity:', error);
      return null;
    }
  };

  // Send volunteer request to specific users
  const sendVolunteerRequest = async (
    userIds: string[],
    opportunityId: string,
    personalMessage?: string
  ) => {
    if (!user) return false;

    try {
      const opportunity = opportunities.find(o => o.id === opportunityId);
      if (!opportunity) return false;

      // Send notifications to specific users
      for (const userId of userIds) {
        await createNotification(
          userId,
          'volunteer_opportunity',
          `${opportunity.roleType.charAt(0).toUpperCase() + opportunity.roleType.slice(1)} Needed!`,
          personalMessage || `We need help with ${opportunity.roleType} for ${opportunity.eventTitle}. Can you help?`,
          opportunity.eventId
        );
      }

      toast.success(`Volunteer request sent to ${userIds.length} people`);
      return true;
    } catch (error) {
      console.error('Error sending volunteer request:', error);
      return false;
    }
  };

  // Get volunteer opportunities for a specific event
  const getEventOpportunities = (eventId: string) => {
    return opportunities.filter(opp => opp.eventId === eventId);
  };

  // Get urgent opportunities
  const getUrgentOpportunities = () => {
    return opportunities.filter(opp => opp.urgency === 'high' || opp.status === 'urgent');
  };

  // Update volunteer role status
  const updateVolunteerRoleStatus = async (roleId: string, status: 'confirmed' | 'completed') => {
    setMyVolunteerRoles(prev =>
      prev.map(role =>
        role.id === roleId ? { ...role, status } : role
      )
    );
    
    toast.success(`Role status updated to ${status}`);
  };

  return {
    opportunities,
    myVolunteerRoles,
    loading,
    signUpForOpportunity,
    createOpportunity,
    sendVolunteerRequest,
    getEventOpportunities,
    getUrgentOpportunities,
    updateVolunteerRoleStatus
  };
};