import React from 'react';
import { User, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './auth/AuthModal';

interface HeaderProps {
  onShowAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowAuth }) => {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-lg p-2 mr-3">
              <span className="font-bold text-lg">WnY</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Worship and Yapps</h1>
              <p className="text-xs text-gray-500">Calgary Bible Study Community</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings size={20} />
            </button>
            
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{profile?.role || 'member'}</p>
                </div>
                <button 
                  onClick={signOut}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={onShowAuth} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};