// lib/auth-helpers.ts
'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

export const customSignIn = (provider: string = 'google') => {
  window.location.href = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
};

export const customSignOut = async () => {
  try {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

// Custom hook to get session data without useSession
export const useCustomSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setSession(data);
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
        } else {
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        setStatus('unauthenticated');
      }
    };

    fetchSession();
  }, []);

  return { data: session, status };
};