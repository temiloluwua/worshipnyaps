import React, { useState } from 'react';
import { X, Calendar, Users, Music, Coffee, Heart, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import toast from 'react-hot-toast';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOpportunity: (opportunity: any) => void;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  onCreateOpportunity
}) => {
  const { user } = useAuth();
  const { events } = useEvents();
  const [formData, setFormData] = useState({
    eventId: '',
    roleType: 'worship' as 'worship' | 'discussion' | 'hospitality' | 'prayer' | 'tech',
    description: '',
    skillsNeeded: [] as string[],
    urgency: 'medium' as 'low' | 'medium' | 'high',
    deadline: '',
    volunteersNeeded: 1,
    sendNotifications: true,
    targetAudience: 'all' as 'all' | 'experienced' | 'new'
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const roleOptions = [
    { value: 'worship', label: 'Worship Leader', icon: Music, description: 'Lead music and singing' },
    { value: 'discussion', label: 'Discussion Leader', icon: Users, description: 'Guide group discussions' },
    { value: 'hospitality', label: 'Hospitality Coordinator', icon: Coffee, description: 'Coordinate food and setup' },
    { value: 'prayer', label: 'Prayer Leader', icon: Heart, description: 'Lead opening and closing prayers' },
    { value: 'tech', label: 'Tech Support', icon: Users, description: 'Handle audio/visual needs' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-gray-600', description: 'Nice to have, flexible timing' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', description: 'Important, some urgency' },
    { value: 'high', label: 'High Priority', color: 'text-red-600', description: 'Urgent, needed ASAP' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skillsNeeded.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsNeeded: [...prev.skillsNeeded, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsNeeded: prev.skillsNeeded.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventId) {
      toast.error('Please select an event');
      return;
    }

    const selectedEvent = events.find(e => e.id === formData.eventId);
    if (!selectedEvent) {
      toast.error('Selected event not found');
      return;
    }

    const opportunity = {
      id: Date.now().toString(),
      eventId: formData.eventId,
      eventTitle: selectedEvent.title,
      eventDate: selectedEvent.date,
      eventTime: selectedEvent.time,
      roleType: formData.roleType,
      description: formData.description,
      skillsNeeded: formData.skillsNeeded,
      urgency: formData.urgency,
      deadline: formData.deadline,
      volunteersNeeded: formData.volunteersNeeded,
      volunteersSignedUp: 0,
      status: 'open' as const,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      customMessage,
      targetAudience: formData.targetAudience,
      sendNotifications: formData.sendNotifications
    };

    onCreateOpportunity(opportunity);
    
    // Reset form
    setFormData({
      eventId: '',
      roleType: 'worship',
      description: '',
      skillsNeeded: [],
      urgency: 'medium',
      deadline: '',
      volunteersNeeded: 1,
      sendNotifications: true,
      targetAudience: 'all'
    });
    setCustomMessage('');
    
    toast.success('Volunteer opportunity created and notifications sent!');
    onClose();
  };

  const selectedRole = roleOptions.find(role => role.value === formData.roleType);
  const selectedEvent = events.find(e => e.id === formData.eventId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Request Volunteer Help</h2>
            <p className="text-sm text-gray-600">Create an opportunity and notify potential volunteers</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event
              </label>
              <select
                name="eventId"
                value={formData.eventId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.date} at {event.time}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Role Needed
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, roleType: role.value as any }))}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.roleType === role.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${
                          formData.roleType === role.value ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900">{role.label}</div>
                          <div className="text-sm text-gray-600">{role.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={`Describe what the ${selectedRole?.label.toLowerCase()} will need to do...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            {/* Skills Needed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Helpful Skills (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skillsNeeded.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g., Guitar playing, Public speaking..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Urgency and Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {urgencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Deadline
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volunteers Needed
                </label>
                <input
                  type="number"
                  name="volunteersNeeded"
                  value={formData.volunteersNeeded}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who should receive this request?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'Everyone in the community', description: 'Send to all members' },
                  { value: 'experienced', label: 'Experienced volunteers only', description: 'People who have volunteered before' },
                  { value: 'new', label: 'New volunteers welcome', description: 'Encourage first-time volunteers' }
                ].map(option => (
                  <label key={option.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="targetAudience"
                      value={option.value}
                      checked={formData.targetAudience === option.value}
                      onChange={handleInputChange}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal note to encourage volunteers..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Notification Settings */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="sendNotifications"
                  checked={formData.sendNotifications}
                  onChange={handleInputChange}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-blue-900">Send push notifications</div>
                  <div className="text-sm text-blue-700">Notify potential volunteers immediately</div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {selectedEvent && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Preview:</h4>
                <div className="text-sm text-gray-700">
                  <p className="mb-1">
                    <strong>{selectedRole?.label}</strong> needed for <strong>{selectedEvent.title}</strong>
                  </p>
                  <p className="mb-1">📅 {selectedEvent.date} at {selectedEvent.time}</p>
                  <p className="mb-1">⏰ Respond by {formData.deadline}</p>
                  <p>👥 {formData.volunteersNeeded} volunteer{formData.volunteersNeeded > 1 ? 's' : ''} needed</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};