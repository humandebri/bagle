// types/next-auth.d.ts
import NextAuth from 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';

// セッションの型拡張
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;              // ✅ 追加（adminなど）
    } & DefaultSession['user'];
    accessToken?: string;         // ✅ Supabase連携用
  }

  interface User extends DefaultUser {
    id: string;
    role?: string;
  }
}

// JWTの型拡張（jwtコールバックで扱う）
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
  }
}
