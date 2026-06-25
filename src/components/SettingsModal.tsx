import React, { useState } from 'react';
import { Sun, Moon, Monitor, Globe, Trash2, AlertTriangle, Sparkles, FileText, Shield, ScrollText, ShieldAlert, LogOut, ChevronDown, ChevronUp, BookOpen, Type, Palette } from 'lucide-react';
import { usePreferences, FontFamily, AccentColor } from '../hooks/usePreferences';
import { BIBLE_VERSIONS } from '../lib/bibleLink';
import { AdminConsole } from './admin/AdminConsole';
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
  const { i18n, t } = useTranslation();
  const { theme, setTheme, resetToSystem, isSystemPreference } = useTheme();
  const { user, profile, deleteAccount, signOut } = useAuth();
  const { prefs, update: updatePrefs } = usePreferences();

  const fontOptions: { value: FontFamily; label: string; sample: string }[] = [
    { value: 'default', label: 'Default', sample: 'Aa' },
    { value: 'serif',   label: 'Serif',   sample: 'Aa' },
    { value: 'modern',  label: 'Modern',  sample: 'Aa' },
  ];
  const accentOptions: { value: AccentColor; label: string; hex: string }[] = [
    { value: 'blue',   label: 'Blue',   hex: '#2563eb' },
    { value: 'teal',   label: 'Teal',   hex: '#14b8a6' },
    { value: 'purple', label: 'Purple', hex: '#a855f7' },
    { value: 'amber',  label: 'Amber',  hex: '#f59e0b' },
    { value: 'pink',   label: 'Pink',   hex: '#ec4899' },
  ];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sign out');
    }
  };

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
    <>
    {showAdminConsole && <AdminConsole onClose={() => setShowAdminConsole(false)} />}
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <ModalBody>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.language')}</h3>
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.theme')}</h3>
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
                <span className="flex-1">{t('settings.light')}</span>
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
                <span className="flex-1">{t('settings.dark')}</span>
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
                <span className="flex-1">{t('settings.system')}</span>
                {isSystemPreference && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bible version</h3>
            </div>
            <select
              value={prefs.bibleVersion}
              onChange={(e) => updatePrefs({ bibleVersion: e.target.value as typeof prefs.bibleVersion })}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.code} value={v.code}>{v.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tap a verse anywhere in the app to open it in your chosen translation.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Type size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Font</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fontOptions.map((f) => (
                <button
                  key={f.value}
                  onClick={() => updatePrefs({ fontFamily: f.value })}
                  className={`flex flex-col items-center justify-center py-3 rounded-lg text-sm transition-all ${
                    prefs.fontFamily === f.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="text-2xl font-bold mb-1"
                    style={{
                      fontFamily:
                        f.value === 'serif' ? 'Georgia, serif'
                        : f.value === 'modern' ? 'Inter, sans-serif'
                        : 'Quicksand, sans-serif',
                    }}
                  >
                    {f.sample}
                  </span>
                  <span className="text-xs">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Accent color</h3>
            </div>
            <div className="flex gap-3 flex-wrap">
              {accentOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updatePrefs({ accent: c.value })}
                  className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                    prefs.accent === c.value
                      ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={`Set accent to ${c.label}`}
                >
                  {prefs.accent === c.value && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Recolors primary buttons, active tabs, focus rings, and pills. Brand gradients keep their blue-to-teal sweep.
            </p>
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

          {isStaff && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={() => setShowAdminConsole(true)}
                className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <ShieldAlert size={16} />
                <span className="flex-1 font-semibold">Admin Console</span>
                <span className="text-xs uppercase tracking-wide opacity-70">{profile?.role}</span>
              </button>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <ScrollText size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Legal &amp; community</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText size={16} className="text-blue-500" />
                <span className="flex-1">Terms of Service &amp; Community Guidelines</span>
              </a>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Shield size={16} className="text-blue-500" />
                <span className="flex-1">Privacy Policy</span>
              </a>
              <a
                href="/support.html"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <AlertTriangle size={16} className="text-blue-500" />
                <span className="flex-1">Support &amp; report abuse</span>
              </a>
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={() => { throw new Error('Sentry test ' + Date.now()); }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
              >
                Trigger test error (dev only)
              </button>
            </div>
          )}

          {user && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('settings.account')}</h3>

              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2"
              >
                <LogOut size={16} className="text-gray-500" />
                <span className="flex-1">{t('settings.signOut')}</span>
              </button>

              <button
                onClick={() => setShowMore(v => !v)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-xs flex items-center gap-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="flex-1">{t('settings.moreOptions')}</span>
                {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showMore && (!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-2 w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 size={16} />
                  <span className="flex-1">{t('settings.deleteAccount')}</span>
                </button>
              ) : (
                <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
                  <div className="flex gap-2">
                    <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-semibold mb-1">{t('settings.deleteAccountWarningTitle')}</p>
                      <p>{t('settings.deleteAccountWarningBody')}</p>
                    </div>
                  </div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300">
                    {t('settings.typeToConfirm')}
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
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== DELETE_CONFIRM_PHRASE || isDeleting}
                      className="flex-1 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? t('common.loading') : t('settings.deleteForever')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
    </>
  );
};
