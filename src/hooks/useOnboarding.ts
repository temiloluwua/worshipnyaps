import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenBefore = localStorage.getItem('hasSeenOnboarding');
    
    if (!hasSeenBefore) {
      // Show onboarding after a short delay for better UX
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setHasSeenOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('hasSeenOnboarding');
    setHasSeenOnboarding(false);
    setShowOnboarding(true);
  };

  const skipOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
  };

  return {
    showOnboarding,
    hasSeenOnboarding,
    completeOnboarding,
    resetOnboarding,
    skipOnboarding
  };
};