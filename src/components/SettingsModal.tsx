import React from 'react';
import { Sun, Moon, Monitor, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Modal, ModalBody } from './ui/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const { theme, setTheme, resetToSystem, isSystemPreference } = useTheme();

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
        </div>
      </ModalBody>
    </Modal>
  );
};
