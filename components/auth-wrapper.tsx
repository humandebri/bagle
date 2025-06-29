'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

interface AuthWrapperProps {
  children: React.ReactNode;
  session?: Session | null;
}

export default function AuthWrapper({ children, session }: AuthWrapperProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}