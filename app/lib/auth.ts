import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

// 管理者のメールアドレスリスト
const ADMIN_EMAILS = [
  'qwertyuiop123456@gmail.com', // ここに管理者のメールアドレスを追加
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token }) {
      // Google のユーザーID（数値文字列）をセッションに渡す
      token.id = token.sub;
      
      // メールアドレスが管理者リストに含まれているかチェック
      if (token.email && ADMIN_EMAILS.includes(token.email)) {
        token.role = 'admin';
      }
      
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      // セッションにロール情報を追加
      session.user.role = token.role as string;
      return session;
    },
  },
};
