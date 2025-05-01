// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  // Session 用
  interface Session {
    user: {
      id: string;            // ← 追加
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  // User 用（DB レコード）
  interface User {
    id: string;              // ← 追加
  }
}