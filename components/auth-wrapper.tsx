'use client';

// React 19対応のため、SessionProviderを使用せずに子要素をそのまま返す
// 認証状態は各コンポーネントでuseAuthフックを使用して取得
export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}