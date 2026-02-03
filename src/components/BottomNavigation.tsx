import React from 'react';
import { MessageSquare, MapPin, Users, ShoppingBag, Search, Mail, Bell } from 'lucide-react';

export type TabType = 'topics' | 'locations' | 'network' | 'shop' | 'search' | 'messages' | 'notifications';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  unreadMessages = 0,
  unreadNotifications = 0,
}) => {
  const tabs = [
    {
      id: 'topics' as const,
      name: 'Home',
      icon: MessageSquare,
    },
    {
      id: 'search' as const,
      name: 'Search',
      icon: Search,
    },
    {
      id: 'locations' as const,
      name: 'Events',
      icon: MapPin,
    },
    {
      id: 'messages' as const,
      name: 'Messages',
      icon: Mail,
      badge: unreadMessages,
    },
    {
      id: 'network' as const,
      name: 'Network',
      icon: Users,
    },
  ];

  return (
    <nav
      id="main-navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 transition-colors"
    >
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          const badge = (tab as any).badge;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon size={20} aria-hidden="true" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
