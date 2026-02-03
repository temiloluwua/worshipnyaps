@@ .. @@
 import React, { useState } from 'react';
-import { Menu, X, Calendar, MessageSquare, Users, MapPin, User, LogOut } from 'lucide-react';
+import { Menu, X, Calendar, MessageSquare, Users, MapPin, User, LogOut, Store } from 'lucide-react';
 import { Link, useLocation } from 'react-router-dom';
 import { useAuth } from '../../hooks/useAuth';
+import { AuthModal } from '../auth/AuthModal';
 
 export function Header() {
   const [isMenuOpen, setIsMenuOpen] = useState(false);
+  const [showAuthModal, setShowAuthModal] = useState(false);
   const location = useLocation();
   const { user, signOut } = useAuth();
 
@@ .. @@
     { name: 'Events', href: '/events', icon: Calendar },
     { name: 'Community', href: '/community', icon: MessageSquare },
     { name: 'Connections', href: '/connections', icon: Users },
     { name: 'Locations', href: '/locations', icon: MapPin },
+    { name: 'Shop', href: '/shop', icon: Store },
   ];
 
@@ .. @@
           <div className="flex items-center space-x-4">
             {user ? (
               <div className="flex items-center space-x-4">
+                <Link
+                  to="/shop"
+                  className="text-gray-700 hover:text-indigo-600 transition-colors"
+                >
+                  <Store className="w-5 h-5" />
+                </Link>
                 <div className="flex items-center space-x-2">
@@ .. @@
                 </button>
               </div>
             ) : (
-              <div className="flex items-center space-x-4">
-                <Link
-                  to="/login"
-                  className="text-gray-700 hover:text-indigo-600 transition-colors"
-                >
-                  Sign In
-                </Link>
-                <Link
-                  to="/signup"
-                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
-                >
-                  Sign Up
-                </Link>
-              </div>
+              <div className="flex items-center space-x-4">
+                <Link
+                  to="/shop"
+                  className="text-gray-700 hover:text-indigo-600 transition-colors"
+                >
+                  <Store className="w-5 h-5" />
+                </Link>
+                <button
+                  onClick={() => setShowAuthModal(true)}
+                  className="text-gray-700 hover:text-indigo-600 transition-colors"
+                >
+                  Sign In
+                </button>
+                <button
+                  onClick={() => setShowAuthModal(true)}
+                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
+                >
+                  Sign Up
+                </button>
+              </div>
             )}
           </div>
@@ .. @@
         </div>
       </nav>
+
+      <AuthModal
+        isOpen={showAuthModal}
+        onClose={() => setShowAuthModal(false)}
+      />
     </header>
   );
 }