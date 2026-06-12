import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, UserPlus, Mail, CheckCircle2, AtSign, Check, X as XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { SocialAuthButtons } from './SocialAuthButtons';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  // Debounced availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('is_username_available', { p_username: trimmed });
        if (error) {
          setUsernameStatus('idle');
          return;
        }
        setUsernameStatus(data ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      toast.error('Username must be 3-20 chars: lowercase letters, numbers, and underscores only.');
      return;
    }
    if (usernameStatus === 'taken') {
      toast.error('That username is taken. Try another.');
      return;
    }
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, username: trimmedUsername } },
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (authData.user) {
        if (authData.user.identities && authData.user.identities.length === 0) {
          toast.error('An account with this email already exists. Please sign in instead.');
          return;
        }
        if (authData.session) {
          toast.success('Account created successfully!');
          onSuccess?.();
        } else {
          setConfirmationPending(true);
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (confirmationPending) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your inbox</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            We sent a confirmation link to{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{email}</span>.
            Click the link in that email, then come back and sign in.
          </p>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Don't see it? Check your spam folder, or wait a minute and refresh your inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="mt-6 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Join our community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                minLength={3}
                maxLength={20}
                className="w-full pl-9 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="your_username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {usernameStatus === 'checking' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
              )}
              {usernameStatus === 'available' && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <XIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {usernameStatus === 'taken' && <span className="text-red-500">Taken — try another</span>}
              {usernameStatus === 'invalid' && <span className="text-red-500">3-20 chars, lowercase letters / numbers / underscores</span>}
              {usernameStatus === 'available' && <span className="text-green-600">Available!</span>}
              {(usernameStatus === 'idle' || usernameStatus === 'checking') && 'How people will find you — 3-20 chars'}
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 pr-11 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Create a password (min. 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            By creating an account, you agree to our{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</a>.
            Harassment and objectionable content are not tolerated — see our community guidelines for details.
          </p>
        </form>

        <div className="mt-6">
          <SocialAuthButtons onSuccess={onSuccess} mode="signup" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
