'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

// React 19対応のカスタムフック - useSessionの代替
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setSession(data);
          setStatus('authenticated');
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        setSession(null);
        setStatus('unauthenticated');
      });
  }, []);

  return { data: session, status };
}