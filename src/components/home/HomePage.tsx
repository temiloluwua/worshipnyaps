import React from 'react';
import { Calendar, MessageSquare, Users, MapPin, Heart, BookOpen, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { name: 'Events', href: '/events', icon: Calendar, description: 'Discover and join faith-based events in your community' },
  { name: 'Community', href: '/community', icon: MessageSquare, description: 'Join discussions and share your faith journey' },
  { name: 'Connections', href: '/connections', icon: Users, description: 'Build meaningful relationships with fellow believers' },
  { name: 'Locations', href: '/locations', icon: MapPin, description: 'Find and host gatherings in your area' },
  { name: 'Shop', href: '/shop', icon: Store, description: 'Faith-building resources and community merchandise' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <Heart className="w-20 h-20 text-pink-300 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-6">
            Connect. Grow. Serve.
          </h1>
          <p className="text-xl mb-8 text-gray-200">
            Join a vibrant community of believers dedicated to growing in faith and serving others
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="bg-white text-indigo-900 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Explore Events
            </Link>
            <Link
              to="/community"
              className="border-2 border-white text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white hover:text-indigo-900 transition-colors"
            >
              Join Community
            </Link>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <BookOpen className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Our Mission
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            We believe in the power of community to transform lives. Our platform brings together 
            believers from all walks of life to share experiences, support one another, and grow 
            together in faith. Whether you're seeking spiritual guidance, looking to serve others, 
            or simply want to connect with like-minded individuals, you'll find your place here.
          </p>
        </div>
      </section>

      {/* Shop Section */}
      <section className="py-16 bg-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <Store className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Faith Resources & Merchandise
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Discover tools and resources to deepen your faith and strengthen your community connections
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Store className="w-5 h-5" />
            Visit Store
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Discover What We Offer
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.name}
                  to={feature.href}
                  className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <Icon className="w-12 h-12 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of believers who have found their spiritual home in our community
          </p>
          <Link
            to="/events"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}