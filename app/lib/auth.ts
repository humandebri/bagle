// app/lib/auth.ts
import GoogleProvider from 'next-auth/providers/google';
import { AuthOptions } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          // ✅ クエリに admin=1 が含まれていれば prompt: 'consent'
          prompt: typeof globalThis?.URLSearchParams !== 'undefined' &&
                  new URLSearchParams(globalThis.location?.search || '').get('admin') === '1'
                    ? 'consent'
                    : 'select_account', // ← 通常はこれでUX改善
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin', // ← ✅ ここを追加
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;
  
        // 🔽 Supabaseのprofilesテーブルからis_adminを取得
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', account.providerAccountId)
          .single();
  
        if (data?.is_admin) {
          token.role = 'admin';
        } else {
          token.role = 'user';
        }
      }
  
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role= token.role as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
