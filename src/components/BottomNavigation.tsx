import React from 'react';
import { MessageSquare, MapPin, Users, UserPlus, ShoppingBag } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'topics' | 'locations' | 'signup' | 'network' | 'shop';
  onTabChange: (tab: 'topics' | 'locations' | 'signup' | 'network' | 'shop') => void;
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
    {
      id: 'signup' as const,
      name: 'Serve',
      icon: UserPlus,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};