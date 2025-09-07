import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Heart, MessageCircle, Users, MapPin, Sparkles } from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Welcome to Worship & Yapps",
      subtitle: "Calgary's Bible Study Community",
      description: "Connect with fellow believers, dive deep into meaningful discussions, and build lasting friendships through faith-centered gatherings across Calgary.",
      image: "/images/onboarding/1.png",
      icon: Heart,
      color: "text-pink-600",
      gradient: "from-pink-500 to-purple-600"
    },
    {
      id: 2,
      title: "Discover Discussion Cards",
      subtitle: "Swipe Through Thought-Provoking Topics",
      description: "Explore interactive discussion cards with Bible study questions, life topics, and conversation starters designed to spark meaningful dialogue and spiritual growth.",
      image: "/images/onboarding/2.png",
      icon: MessageCircle,
      color: "text-blue-600",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      id: 3,
      title: "Find Local Events",
      subtitle: "Bible Studies & Community Gatherings",
      description: "Discover Bible studies, basketball & yap sessions, hiking groups, and other faith-based activities happening near you in Calgary.",
      image: "/images/onboarding/3.png",
      icon: MapPin,
      color: "text-green-600",
      gradient: "from-green-500 to-teal-600"
    },
    {
      id: 4,
      title: "Connect with Community",
      subtitle: "Build Meaningful Relationships",
      description: "Meet like-minded believers, join small groups, find mentors, and create connections that go beyond Sunday service.",
      image: "/images/onboarding/4.png",
      icon: Users,
      color: "text-purple-600",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      id: 5,
      title: "Serve & Host Events",
      subtitle: "Open Your Home & Heart",
      description: "Host Bible studies, volunteer for events, coordinate food, lead worship, and serve your community in meaningful ways.",
      image: "/images/onboarding/5.png",
      icon: Sparkles,
      color: "text-orange-600",
      gradient: "from-orange-500 to-red-600"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex !== currentStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(stepIndex);
        setIsAnimating(false);
      }, 300);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 bg-gradient-to-r ${currentStepData.gradient} rounded-full flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Getting Started</h2>
              <p className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                  index <= currentStep 
                    ? `bg-gradient-to-r ${currentStepData.gradient}` 
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* Image Section */}
          <div className="lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
            <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="relative">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwTDE4MCA5MEwyMjAgOTBMMjAwIDE1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHN2Zz4K';
                    target.alt = 'Worship and Yapps - Step ' + (currentStep + 1);
                  }}
                />
                {/* Decorative elements */}
                <div className={`absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r ${currentStepData.gradient} rounded-full opacity-20 animate-pulse`}></div>
                <div className={`absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r ${currentStepData.gradient} rounded-full opacity-30 animate-pulse delay-300`}></div>
              </div>
            </div>
          </div>

          {/* Text Section */}
          <div className="lg:w-1/2 p-8 flex flex-col justify-center">
            <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r ${currentStepData.gradient} rounded-full text-white text-sm font-medium mb-6 shadow-lg`}>
                <Icon className="w-4 h-4" />
                <span>Step {currentStep + 1}</span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {currentStepData.title}
              </h1>
              
              <h2 className={`text-xl font-semibold mb-6 ${currentStepData.color}`}>
                {currentStepData.subtitle}
              </h2>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {currentStepData.description}
              </p>

              {/* Feature highlights for specific steps */}
              {currentStep === 1 && (
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Interactive discussion cards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Local event discovery</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">Community networking</span>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl mb-8 border border-orange-200">
                  <p className="text-orange-800 font-medium">
                    💡 Ready to make a difference? Start by hosting your first Bible study or volunteering at local events!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? `bg-gradient-to-r ${currentStepData.gradient} scale-125`
                    : index < currentStep
                    ? 'bg-gray-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-lg hover:shadow-xl transform hover:scale-105 bg-gradient-to-r ${currentStepData.gradient}`}
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};