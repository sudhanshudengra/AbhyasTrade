import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Clean up Supabase OAuth hash fragments from URL (e.g. /#access_token=... or /#)
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash === '#')) {
      const cleanPath = window.location.pathname === '/login' ? '/' : window.location.pathname;
      window.history.replaceState(null, '', cleanPath || '/');
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Clean hash after session is loaded
      if (window.location.hash) {
        window.history.replaceState(null, '', session?.user ? '/' : '/login');
      }
    }).catch(() => {
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (window.location.pathname === '/login' || window.location.hash) {
          window.history.replaceState(null, '', '/');
        }
      } else if (event === 'SIGNED_OUT') {
        window.history.replaceState(null, '', '/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    return await signInWithGoogle();
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    window.history.replaceState(null, '', '/login');
  }, []);

  const userProfile: UserProfile | null = user
    ? {
        id: user.id,
        email: user.email ?? null,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Trader',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      }
    : null;

  return {
    user,
    userProfile,
    userId: user?.id || '00000000-0000-0000-0000-000000000001',
    isAuthenticated: !!user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
  };
}
