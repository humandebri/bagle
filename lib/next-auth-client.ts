'use client';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

export const clientSignIn = (provider: string = 'google') => {
  nextAuthSignIn(provider, { 
    callbackUrl: window.location.pathname,
    redirect: true 
  });
};

export const clientSignOut = () => {
  nextAuthSignOut({ 
    callbackUrl: '/',
    redirect: true 
  });
};