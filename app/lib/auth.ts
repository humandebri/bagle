import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// セッションの型を拡張
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    }
  }
}

// 管理者のメールアドレスリスト
const ADMIN_EMAILS = [
  'qwertyuiop123456@gmail.com', // ここに管理者のメールアドレスを追加
];

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token }: { token: JWT }) {
      // Google のユーザーID（数値文字列）をセッションに渡す
      token.id = token.sub;
      
      // メールアドレスが管理者リストに含まれているかチェック
      if (token.email && ADMIN_EMAILS.includes(token.email)) {
        token.role = 'admin';
      }
      
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.id as string;
      // セッションにロール情報を追加
      session.user.role = token.role as string;
      return session;
    },
  },
};
