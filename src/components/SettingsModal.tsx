import React, { useState } from 'react';
import { Sun, Moon, Monitor, Globe, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Modal, ModalBody } from './ui/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLanding?: () => void;
}

const languages = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

const DELETE_CONFIRM_PHRASE = 'DELETE';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onShowLanding }) => {
  const { i18n } = useTranslation();
  const { theme, setTheme, resetToSystem, isSystemPreference } = useTheme();
  const { user, deleteAccount } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== DELETE_CONFIRM_PHRASE) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success('Your account has been deleted.');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <ModalBody>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Language</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                    i18n.language === lang.code
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="font-mono text-xs font-semibold w-6">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {i18n.language === lang.code && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sun size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Theme</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  theme === 'light' && !isSystemPreference
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Sun size={16} />
                <span className="flex-1">Light</span>
                {theme === 'light' && !isSystemPreference && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  theme === 'dark' && !isSystemPreference
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Moon size={16} />
                <span className="flex-1">Dark</span>
                {theme === 'dark' && !isSystemPreference && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
              <button
                onClick={resetToSystem}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  isSystemPreference
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Monitor size={16} />
                <span className="flex-1">System</span>
                {isSystemPreference && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {onShowLanding && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={onShowLanding}
                className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Sparkles size={16} className="text-blue-500" />
                <span className="flex-1">View welcome tour</span>
              </button>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={() => { throw new Error('Sentry test ' + Date.now()); }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              Trigger test error
            </button>
          </div>

          {user && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h3>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 size={16} />
                  <span className="flex-1">Delete account</span>
                </button>
              ) : (
                <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
                  <div className="flex gap-2">
                    <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-semibold mb-1">This permanently deletes your account.</p>
                      <p>Your profile, posts, comments, events, messages, and connections will be removed. This cannot be undone.</p>
                    </div>
                  </div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300">
                    Type <span className="font-mono font-semibold">{DELETE_CONFIRM_PHRASE}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={DELETE_CONFIRM_PHRASE}
                    autoCapitalize="characters"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isDeleting}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setConfirmText('');
                      }}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== DELETE_CONFIRM_PHRASE || isDeleting}
                      className="flex-1 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};
