import React, { useRef, useState } from 'react';
import { Camera, Check, ChevronRight, Sparkles, Plus, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

interface OnboardingFlowProps {
  onComplete: () => void;
  onCreatePost: () => void;
  onBrowseEvents: () => void;
}

const SPIRITUAL_GIFTS = [
  'Worship', 'Teaching', 'Prayer', 'Hospitality', 'Discernment',
  'Service', 'Encouragement', 'Leadership', 'Mercy', 'Giving', 'Faith',
];

type Step = 1 | 2 | 3;

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onCreatePost,
  onBrowseEvents,
}) => {
  const { user, profile } = useAuth();
  const { updateProfile, uploadAvatar } = useProfile();

  const [step, setStep] = useState<Step>(1);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState(profile?.bio || '');
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const dismissPermanently = () => {
    try {
      localStorage.setItem(`wny_onboarding_done_${user.id}`, '1');
    } catch {
      // ignore
    }
    onComplete();
  };

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggleGift = (gift: string) => {
    setSelectedGifts(prev =>
      prev.includes(gift) ? prev.filter(g => g !== gift) : [...prev, gift]
    );
  };

  const handleNextFromStep1 = async () => {
    if (avatarFile) {
      setSaving(true);
      try {
        const url = await uploadAvatar(avatarFile);
        if (url) {
          await updateProfile({ avatar_url: url });
        }
      } finally {
        setSaving(false);
      }
    }
    setStep(2);
  };

  const handleNextFromStep2 = async () => {
    if (bio.trim() || selectedGifts.length > 0) {
      setSaving(true);
      try {
        await updateProfile({
          bio: bio.trim() || undefined,
          spiritual_gifts: selectedGifts.length > 0 ? selectedGifts : undefined,
        });
      } finally {
        setSaving(false);
      }
    }
    setStep(3);
  };

  const handleFinish = () => {
    dismissPermanently();
  };

  const handleCreatePostClick = () => {
    dismissPermanently();
    onCreatePost();
  };

  const handleBrowseEventsClick = () => {
    dismissPermanently();
    onBrowseEvents();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 overflow-y-auto">
      <div className="min-h-screen flex flex-col px-6 py-8 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  step >= n ? 'w-8 bg-blue-600' : 'w-6 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={dismissPermanently}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Skip setup
          </button>
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome, {profile?.name?.split(' ')[0] || 'friend'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Let's set up your profile so the community can get to know you.
            </p>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 overflow-hidden mb-3 group focus:outline-none focus:ring-4 focus:ring-blue-300"
              aria-label="Pick a profile picture"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Your profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePickAvatar}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-10"
            >
              {avatarPreview ? 'Change photo' : 'Add a profile photo'}
            </button>

            <div className="mt-auto w-full space-y-2">
              <button
                onClick={handleNextFromStep1}
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? 'Saving...' : 'Continue'}
                {!saving && <ChevronRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Tell us about you
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
              Help others get to know you (optional — you can do this later too).
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Short bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={180}
              rows={3}
              placeholder="e.g., Loving Jesus, learning every day."
              className="w-full px-4 py-3 mb-1 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mb-6">{bio.length}/180</p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Spiritual gifts
            </label>
            <div className="flex flex-wrap gap-2 mb-8">
              {SPIRITUAL_GIFTS.map(gift => {
                const selected = selectedGifts.includes(gift);
                return (
                  <button
                    key={gift}
                    type="button"
                    onClick={() => toggleGift(gift)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selected
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 inline mr-1" />}
                    {gift}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto w-full space-y-2">
              <button
                onClick={handleNextFromStep2}
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? 'Saving...' : 'Continue'}
                {!saving && <ChevronRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              You're all set!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
              The community is waiting. What do you want to do first?
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleCreatePostClick}
                className="w-full p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Share your first post</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">A Bible verse, a question, or a testimony.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={handleBrowseEventsClick}
                className="w-full p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Find events near you</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bible studies, hangouts, hikes.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleFinish}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Just take me to the app
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
