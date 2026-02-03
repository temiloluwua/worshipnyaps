@@ .. @@
 import React from 'react';
-import { Calendar, MessageSquare, Users, MapPin, Heart, BookOpen } from 'lucide-react';
+import { Calendar, MessageSquare, Users, MapPin, Heart, BookOpen, Store } from 'lucide-react';
 import { Link } from 'react-router-dom';
 
@@ .. @@
     { name: 'Community', href: '/community', icon: MessageSquare, description: 'Join discussions and share your faith journey' },
     { name: 'Connections', href: '/connections', icon: Users, description: 'Build meaningful relationships with fellow believers' },
     { name: 'Locations', href: '/locations', icon: MapPin, description: 'Find and host gatherings in your area' },
+    { name: 'Shop', href: '/shop', icon: Store, description: 'Faith-building resources and community merchandise' },
   ];
 
@@ .. @@
           </div>
         </section>
 
+        {/* Shop Section */}
+        <section className="py-16 bg-indigo-50">
+          <div className="max-w-4xl mx-auto text-center">
+            <Store className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
+            <h2 className="text-3xl font-bold text-gray-900 mb-4">
+              Faith Resources & Merchandise
+            </h2>
+            <p className="text-xl text-gray-600 mb-8">
+              Discover tools and resources to deepen your faith and strengthen your community connections
+            </p>
+            <Link
+              to="/shop"
+              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
+            >
+              <Store className="w-5 h-5" />
+              Visit Store
+            </Link>
+          </div>
+        </section>
+
         {/* Features Grid */}
         <section className="py-16">