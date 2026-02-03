import React, { useState, useRef } from 'react';
import { X, Camera, Plus, X as XIcon } from 'lucide-react';
import { useProfile, ExtendedProfile } from '../../hooks/useProfile';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
  profile: ExtendedProfile;
  onClose: () => void;
  onSave: () => void;
}

const SUGGESTED_INTERESTS = [
  'Bible Study', 'Prayer', 'Worship', 'Youth Ministry', 'Missions',
  'Community Service', 'Small Groups', 'Music', 'Teaching', 'Fellowship',
  'Basketball', 'Hiking', 'Reading', 'Cooking', 'Art'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onClose,
  onSave
}) => {
  const { updateProfile, uploadAvatar, uploadCoverPhoto } = useProfile();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location_text || '');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(profile.cover_photo_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      let coverUrl = profile.cover_photo_url;

      if (avatarFile) {
        const url = await uploadAvatar(avatarFile);
        if (url) avatarUrl = url;
      }

      if (coverFile) {
        const url = await uploadCoverPhoto(coverFile);
        if (url) coverUrl = url;
      }

      const success = await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        location_text: location.trim(),
        interests,
        avatar_url: avatarUrl,
        cover_photo_url: coverUrl
      });

      if (success) {
        onSave();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Profile" hideCloseButton>
      <div className="relative">
        <div className="flex justify-end px-4 py-2 -mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="relative h-32 bg-gradient-to-br from-blue-500 to-blue-700">
          {coverPreview && (
            <img
              src={coverPreview}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        <div className="px-4 pb-6">
          <div className="relative -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {name.charAt(0)}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {name.length}/50
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                placeholder="Tell others about yourself..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {bio.length}/160
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={50}
                placeholder="Calgary, AB"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interests
              </label>

              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="ml-1.5 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInterest(newInterest);
                    }
                  }}
                  placeholder="Add an interest..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => addInterest(newInterest)}
                  disabled={!newInterest.trim() || interests.length >= 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTERESTS.filter(s => !interests.includes(s)).slice(0, 6).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => addInterest(suggestion)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {interests.length}/10 interests
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
