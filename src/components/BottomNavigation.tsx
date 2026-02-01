import React from 'react';
import { MessageSquare, MapPin, Users, ShoppingBag } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'topics' | 'locations' | 'network' | 'shop';
  onTabChange: (tab: 'topics' | 'locations' | 'network' | 'shop') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    {
      id: 'topics' as const,
      name: 'Topics',
      icon: MessageSquare,
    },
    {
      id: 'locations' as const,
      name: 'Events',
      icon: MapPin,
    },
    {
      id: 'network' as const,
      name: 'Community',
      icon: Users,
    },
    {
      id: 'shop' as const,
      name: 'Shop',
      icon: ShoppingBag,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 transition-colors">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
