import React from 'react';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onShowAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowAuth }) => {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-lg p-2 mr-3">
              <span className="font-bold text-lg">WnY</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Worship and Yapps</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Calgary Bible Study Community</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle size="md" />

            <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors relative">
              <Bell size={20} />
              <span className="sr-only">Notifications</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <Settings size={20} />
              <span className="sr-only">Settings</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.role || 'member'}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                  <span className="sr-only">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowAuth}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
