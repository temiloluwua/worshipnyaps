import React, { useState, useEffect } from 'react';
import { Calendar, Users, Music, Coffee, Heart, Bell, CheckCircle, Clock, AlertCircle, Send, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVolunteers } from '../../hooks/useVolunteers';
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
}

export const VolunteerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { 
    opportunities, 
    myVolunteerRoles, 
    signUpForOpportunity, 
    createOpportunity,
    sendVolunteerRequest,
    loading 
  } = useVolunteers();
  
  const [activeTab, setActiveTab] = useState<'opportunities' | 'my-roles' | 'create'>('opportunities');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<VolunteerOpportunity | null>(null);

  const roleIcons = {
    worship: Music,
    discussion: Users,
    hospitality: Coffee,
    prayer: Heart,
    tech: Users
  };

  const roleColors = {
    worship: 'bg-purple-100 text-purple-800 border-purple-200',
    discussion: 'bg-blue-100 text-blue-800 border-blue-200',
    hospitality: 'bg-green-100 text-green-800 border-green-200',
    prayer: 'bg-pink-100 text-pink-800 border-pink-200',
    tech: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const urgencyColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const handleSignUp = async (opportunityId: string) => {
    if (!user) {
      toast.error('Please sign in to volunteer');
      return;
    }

    const success = await signUpForOpportunity(opportunityId);
    if (success) {
      toast.success('Successfully signed up to volunteer!');
    }
  };

  const renderOpportunities = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Volunteer Opportunities</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{opportunities.length} opportunities</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Request Help</span>
          </button>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No volunteer opportunities yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Create First Opportunity
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opportunity) => {
            const Icon = roleIcons[opportunity.roleType];
            const isUrgent = opportunity.urgency === 'high' || opportunity.status === 'urgent';
            const spotsLeft = opportunity.volunteersNeeded - opportunity.volunteersSignedUp;
            
            return (
              <div
                key={opportunity.id}
                className={`bg-white rounded-lg border-2 p-6 transition-all hover:shadow-md ${
                  isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${roleColors[opportunity.roleType]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{opportunity.eventTitle}</h3>
                      <p className="text-sm text-gray-600">
                        {opportunity.roleType.charAt(0).toUpperCase() + opportunity.roleType.slice(1)} Leader Needed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[opportunity.urgency]}`}>
                      {opportunity.urgency} priority
                    </span>
                    {isUrgent && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{opportunity.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {opportunity.eventDate} at {opportunity.eventTime}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Apply by {opportunity.deadline}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {opportunity.volunteersSignedUp}/{opportunity.volunteersNeeded} volunteers
                  </div>
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      spotsLeft === 0 ? 'text-green-600' : spotsLeft <= 2 ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {spotsLeft === 0 ? 'Filled!' : `${spotsLeft} spots left`}
                    </span>
                  </div>
                </div>

                {opportunity.skillsNeeded.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Skills helpful:</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skillsNeeded.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setSelectedOpportunity(opportunity)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                  
                  <button
                    onClick={() => handleSignUp(opportunity.id)}
                    disabled={spotsLeft === 0}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      spotsLeft === 0
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : isUrgent
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {spotsLeft === 0 ? 'Filled' : 'Sign Me Up!'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMyRoles = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">My Volunteer Commitments</h2>
      
      {myVolunteerRoles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">You haven't signed up for any volunteer roles yet</p>
          <button
            onClick={() => setActiveTab('opportunities')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Browse Opportunities
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {myVolunteerRoles.map((role) => {
            const Icon = roleIcons[role.roleType];
            
            return (
              <div key={role.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${roleColors[role.roleType]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.eventTitle}</h3>
                      <p className="text-sm text-gray-600">
                        {role.roleType.charAt(0).toUpperCase() + role.roleType.slice(1)} Leader
                      </p>
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    role.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    role.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {role.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {role.eventDate} at {role.eventTime}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Signed up {role.signedUpAt}
                  </div>
                </div>

                {role.notes && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">{role.notes}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                    View Event Details
                  </button>
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Message Host
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Hub</h1>
        <p className="text-gray-600">Help make our community events amazing</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'opportunities'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Opportunities
          </button>
          <button
            onClick={() => setActiveTab('my-roles')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'my-roles'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Roles
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'opportunities' && renderOpportunities()}
      {activeTab === 'my-roles' && renderMyRoles()}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-900">{opportunities.length}</div>
          <div className="text-sm text-blue-600">Open Opportunities</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-900">{myVolunteerRoles.length}</div>
          <div className="text-sm text-green-600">My Commitments</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-900">
            {opportunities.filter(o => o.urgency === 'high').length}
          </div>
          <div className="text-sm text-purple-600">Urgent Needs</div>
        </div>
      </div>
    </div>
  );
};