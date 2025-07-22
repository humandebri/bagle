// app/lib/auth.ts
import GoogleProvider from 'next-auth/providers/google';
import { AuthOptions } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export const authOptions: AuthOptions = {
  pages: {
    signIn: '/auth/signin', // Custom signin page that auto-redirects to Google
    signOut: '/auth/signout', // Custom signout page that auto-signouts
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async redirect({ url, baseUrl }) {
      // サインインページへのリダイレクトを防ぐ
      if (url.includes('/api/auth/signin') && !url.includes('?')) {
        return baseUrl;
      }
      return url;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;
      }
  
      // 毎回のリクエストでis_adminをチェック（初回ログイン時以外も）
      if (token.id) {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', token.id as string)
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
