import React, { useState, useRef } from 'react';
import { X, Camera, Plus, Check, Sparkles, MapPin, User, FileText, Image, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useProfile, ExtendedProfile } from '../../hooks/useProfile';
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

const SPIRITUAL_GIFTS = [
  { id: 'Connection', label: 'Connection', emoji: '🤝' },
  { id: 'Hosting', label: 'Hosting', emoji: '🏠' },
  { id: 'Worship', label: 'Worship', emoji: '🎵' },
  { id: 'Teaching', label: 'Teaching', emoji: '📖' },
  { id: 'Evangelism', label: 'Evangelism', emoji: '📣' },
  { id: 'Creative', label: 'Creative', emoji: '🎨' },
];

type Section = 'photos' | 'basics' | 'bio' | 'interests' | 'gifts';

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave }) => {
  const { updateProfile, uploadAvatar, uploadCoverPhoto } = useProfile();

  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location_text || '');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [spiritualGifts, setSpiritualGifts] = useState<string[]>(profile.spiritual_gifts || []);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(profile.cover_photo_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => setInterests(interests.filter(i => i !== interest));

  const toggleSpiritualGift = (gift: string) => {
    setSpiritualGifts(prev =>
      prev.includes(gift) ? prev.filter(g => g !== gift) : [...prev, gift]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      let coverUrl = profile.cover_photo_url;

      if (avatarFile) {
        setUploadingAvatar(true);
        const url = await uploadAvatar(avatarFile);
        setUploadingAvatar(false);
        if (url) avatarUrl = url;
        else { toast.error('Failed to upload profile photo'); setSaving(false); return; }
      }

      if (coverFile) {
        setUploadingCover(true);
        const url = await uploadCoverPhoto(coverFile);
        setUploadingCover(false);
        if (url) coverUrl = url;
        else { toast.error('Failed to upload cover photo'); setSaving(false); return; }
      }

      const success = await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        location_text: location.trim(),
        interests,
        spiritual_gifts: spiritualGifts,
        avatar_url: avatarUrl,
        cover_photo_url: coverUrl,
      });

      if (success) onSave();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  };

  const sections: { id: Section; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'photos',
      label: 'Photos',
      description: 'Profile & cover photo',
      icon: <Image className="w-4 h-4" />,
    },
    {
      id: 'basics',
      label: 'Basic Info',
      description: `${name}${location ? ` · ${location}` : ''}`,
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'bio',
      label: 'Bio',
      description: bio ? `${bio.slice(0, 40)}${bio.length > 40 ? '...' : ''}` : 'Add a bio',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'interests',
      label: 'Interests',
      description: interests.length > 0 ? `${interests.length} selected` : 'Add your interests',
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'gifts',
      label: 'Spiritual Gifts',
      description: spiritualGifts.length > 0 ? spiritualGifts.join(', ') : 'Select your gifts',
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'photos':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cover Photo</p>
              <div
                className="relative h-36 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-teal-500 cursor-pointer group"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-16 h-16 rounded-full border-2 border-white/40" />
                    <div className="absolute bottom-4 right-8 w-10 h-10 rounded-full border-2 border-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  {uploadingCover ? (
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-white">
                      <Camera className="w-7 h-7" />
                      <span className="text-xs font-medium">{coverPreview ? 'Change cover' : 'Add cover photo'}</span>
                    </div>
                  )}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverChange} className="hidden" />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Tap to upload · Max 5MB · JPG, PNG, WEBP</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Profile Photo</p>
              <div className="flex items-center gap-4">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500 cursor-pointer group shrink-0"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-center">Tap photo or button to upload</p>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>
        );

      case 'basics':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">{name.length}/50</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={60}
                placeholder="e.g. Calgary, AB"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        );

      case 'bio':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Tell others about yourself — your faith journey, passions, and what makes you unique.
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              maxLength={200}
              placeholder="Share a little about yourself..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{200 - bio.length} characters remaining</span>
              <span className={`text-xs font-medium ${bio.length >= 180 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>{bio.length}/200</span>
            </div>
          </div>
        );

      case 'interests':
        return (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select up to 10 interests that describe you.</p>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                {interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(newInterest); } }}
                placeholder="Type a custom interest..."
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => addInterest(newInterest)}
                disabled={!newInterest.trim() || interests.length >= 10}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm font-medium"
              >
                Add
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_INTERESTS.filter(s => !interests.includes(s)).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => addInterest(suggestion)}
                  disabled={interests.length >= 10}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{interests.length}/10 selected</p>
          </div>
        );

      case 'gifts':
        return (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Select the spiritual gifts you identify with or feel called to use in ministry.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SPIRITUAL_GIFTS.map((gift) => {
                const selected = spiritualGifts.includes(gift.id);
                return (
                  <button
                    key={gift.id}
                    onClick={() => toggleSpiritualGift(gift.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                      selected
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-2xl">{gift.emoji}</span>
                    <span className={`text-sm font-semibold ${selected ? 'text-amber-800 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {gift.label}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {activeSection ? (
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        <h2 className="font-bold text-gray-900 dark:text-white text-base">
          {activeSection ? sections.find(s => s.id === activeSection)?.label : 'Edit Profile'}
        </h2>

        <button
          onClick={activeSection ? () => setActiveSection(null) : handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            saving
              ? 'bg-blue-400 text-white opacity-60 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : activeSection ? 'Done' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSection ? (
          <div className="p-5">
            {renderSectionContent()}
          </div>
        ) : (
          <>
            <div className="relative h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-teal-500 overflow-hidden">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-20 h-20 rounded-full border-2 border-white/40" />
                  <div className="absolute bottom-4 right-8 w-12 h-12 rounded-full border-2 border-white/30" />
                </div>
              )}
              <button
                onClick={() => setActiveSection('photos')}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors"
              >
                <div className="flex items-center gap-2 text-white text-sm font-medium">
                  <Camera className="w-5 h-5" />
                  Edit cover photo
                </div>
              </button>
            </div>

            <div className="px-5 pb-4">
              <div className="relative -mt-12 mb-6">
                <div
                  className="relative w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500 cursor-pointer group shadow-md"
                  onClick={() => setActiveSection('photos')}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {sections.map((section, idx) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      section.id === 'gifts'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{section.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{section.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
