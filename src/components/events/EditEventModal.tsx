import React, { useState } from 'react';
import { X, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Event as DbEvent, DescriptionTemplate } from '../../lib/supabase';
import { EventDescriptionForm } from './EventDescriptionTemplate';
import { TwelveHourTimePicker } from '../ui/TimePicker';
import { EventImageUploader } from './EventImageUploader';

interface EditEventModalProps {
  event: DbEvent;
  onClose: () => void;
  onSaved: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({ event, onClose, onSaved }) => {
  const hasTemplate = Boolean(event.description_template && typeof event.description_template === 'object');

  const [submitting, setSubmitting] = useState(false);
  const [useTemplate, setUseTemplate] = useState(hasTemplate);
  const [descriptionTemplate, setDescriptionTemplate] = useState<DescriptionTemplate>(
    hasTemplate
      ? (event.description_template as DescriptionTemplate)
      : { whatToExpect: '', whatToBring: [], parkingDirections: '', contactInfo: '', specialNotes: '' }
  );
  const [formData, setFormData] = useState({
    title: event.title,
    type: event.type,
    date: event.date,
    time: event.time,
    capacity: event.capacity,
    description: event.description || '',
    visibility: event.visibility as 'public' | 'private' | 'friends_only',
    addressVisibility: (event.address_visibility || 'public') as 'general_area' | 'attendees_only' | 'public',
  });
  const [imageUrl, setImageUrl] = useState<string | null>((event as { image_url?: string | null }).image_url ?? null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const isDraft = !!event.is_draft;

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (publish) {
      if (!formData.date || !formData.time) {
        toast.error('Pick a date and time before publishing');
        return;
      }
    }

    // Safety: a home address must never go fully public. Mirrors the
    // HostEventModal create-time check and the events_home_not_public_check
    // CHECK constraint on the DB so the user sees a friendly toast instead
    // of a raw constraint error.
    let effectiveVisibility = formData.visibility;
    let effectiveAddressVisibility = formData.addressVisibility;
    if (event.location_type === 'home' && effectiveVisibility === 'public') {
      effectiveVisibility = 'friends_only';
      effectiveAddressVisibility = 'attendees_only';
      toast('Home events are kept friends-only to protect your address.', { icon: '🔒' });
    }

    setSubmitting(true);
    try {
      const updates: Record<string, any> = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        capacity: formData.capacity,
        visibility: effectiveVisibility,
        is_private: effectiveVisibility === 'private',
        address_visibility: effectiveAddressVisibility,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      };

      if (publish) {
        updates.is_draft = false;
      }

      if (useTemplate) {
        const hasContent =
          descriptionTemplate.whatToExpect?.trim() ||
          (Array.isArray(descriptionTemplate.whatToBring) && descriptionTemplate.whatToBring.length > 0) ||
          descriptionTemplate.parkingDirections?.trim() ||
          descriptionTemplate.contactInfo?.trim() ||
          descriptionTemplate.specialNotes?.trim();

        if (!hasContent) {
          toast.error('Please fill in at least one template field');
          setSubmitting(false);
          return;
        }
        updates.description_template = descriptionTemplate;
        updates.description = descriptionTemplate.whatToExpect || 'Event details in template';
      } else {
        if (!formData.description.trim()) {
          toast.error('Please enter a description');
          setSubmitting(false);
          return;
        }
        updates.description = formData.description;
        updates.description_template = null;
      }

      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id);

      if (error) throw error;

      toast.success(publish ? 'Draft published!' : 'Event updated!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can discover and RSVP' },
    { value: 'friends_only', label: 'Friends Only', description: 'Only your connections can see it' },
    { value: 'private', label: 'Private', description: 'Invite-code access only' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isDraft ? 'Edit Draft' : 'Edit Event'}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <EventImageUploader value={imageUrl} onChange={setImageUrl} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="bible-study">Bible Study</option>
                <option value="church">Church</option>
                <option value="basketball-yap">Basketball & Yap</option>
                <option value="hiking-yap">Hiking & Yap</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="4"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <TwelveHourTimePicker
                value={formData.time}
                onChange={(v) => setFormData(prev => ({ ...prev, time: v }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setUseTemplate(false)}
                  className={`px-3 py-1 rounded-md transition-colors ${!useTemplate ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Freeform
                </button>
                <button
                  type="button"
                  onClick={() => setUseTemplate(true)}
                  className={`px-3 py-1 rounded-md transition-colors ${useTemplate ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Template
                </button>
              </div>
            </div>
            {useTemplate ? (
              <EventDescriptionForm template={descriptionTemplate} onChange={setDescriptionTemplate} />
            ) : (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe your event..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Who Can See This</label>
            <div className="space-y-2">
              {visibilityOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.visibility === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={formData.visibility === option.value}
                    onChange={handleInputChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address privacy</label>
            <div className="space-y-2">
              {[
                { value: 'general_area', label: 'General area only', description: "Show neighborhood/city. Exact address is never revealed." },
                { value: 'attendees_only', label: 'Visible to RSVPs only', description: 'Public sees the area. Full address unlocks after RSVP.' },
                { value: 'public', label: 'Public address', description: 'Anyone can see the full address.' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.addressVisibility === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="addressVisibility"
                    value={option.value}
                    checked={formData.addressVisibility === option.value}
                    onChange={handleInputChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {isDraft ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
