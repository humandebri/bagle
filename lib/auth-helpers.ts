// lib/auth-helpers.ts
'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

export const customSignIn = (provider: string = 'google') => {
  // Directly redirect to the provider's signin endpoint
  const callbackUrl = encodeURIComponent(window.location.pathname);
  window.location.href = `/api/auth/signin/${provider}?callbackUrl=${callbackUrl}`;
};

export const customSignOut = async () => {
  try {
    // Get CSRF token
    const csrfResponse = await fetch('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    
    // Create form and submit to sign out without showing the page
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signout';
    
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfToken';
    csrfInput.value = csrfToken;
    
    const callbackInput = document.createElement('input');
    callbackInput.type = 'hidden';
    callbackInput.name = 'callbackUrl';
    callbackInput.value = '/';
    
    form.appendChild(csrfInput);
    form.appendChild(callbackInput);
    document.body.appendChild(form);
    form.submit();
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