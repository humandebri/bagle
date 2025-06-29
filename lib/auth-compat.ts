'use client';

import { useEffect, useState } from 'react';
import { Session } from 'next-auth';

// React 19互換のセッション取得フック
export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    // セッションを手動で取得
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        
        if (data && data.user) {
          setSession(data);
          setStatus('authenticated');
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        setSession(null);
        setStatus('unauthenticated');
      }
    };

    fetchSession();
    
    // フォーカス時に再取得
    const handleFocus = () => fetchSession();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return { data: session, status };
}