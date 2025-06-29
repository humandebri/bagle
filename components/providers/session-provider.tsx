// components/providers/session-provider.tsx
'use client';

// import { SessionProvider } from 'next-auth/react'; // NextAuth.js v5以降では不要

export default function NextAuthProvider({ children }: { children: React.ReactNode }) {
  // NextAuth.js v5ではSessionProviderは必須ではなくなりました。
  // 認証状態はサーバーサイドの`auth()`やクライアントサイドの`useSession`で取得します。
  // このコンポーネントは互換性のために残しますが、中身はchildrenを返すだけにします。
  return <>{children}</>;
}
