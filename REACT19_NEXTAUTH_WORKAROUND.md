# React 19 + NextAuth v4 互換性問題の解決方法

## 問題
- React 19とNextAuth v4のSessionProviderに互換性問題があります
- `useSession` が `SessionProvider` を認識できません

## 実装した解決策

### カスタムフック `useAuth` を作成
- `/hooks/useAuth.ts` にカスタムフックを実装
- NextAuthの `/api/auth/session` APIを直接呼び出してセッション情報を取得
- `useSession` と同じインターフェース（`data` と `status`）を提供

### 使用方法

```tsx
// 変更前（useSession）
import { useSession } from 'next-auth/react';
const { data: session, status } = useSession();

// 変更後（useAuth）
import { useAuth } from '@/hooks/useAuth';
const { data: session, status } = useAuth();
```

### 更新が必要なファイル
以下のファイルで `useSession` を `useAuth` に置き換える必要があります：
- `/app/account/orders/page.tsx`
- `/app/account/profile/page.tsx`
- `/app/online-shop/review/page.tsx`
- `/app/online-shop/success/page.tsx`
- `/app/online-shop/checkout/page.tsx`
- `/app/admin/layout.tsx`
- `/app/admin/categories/page.tsx`

### 注意事項
- `signIn` と `signOut` は引き続き `next-auth/react` から使用できます
- サーバーコンポーネントでは `getServerSession` を使用してください
- 将来的にNextAuth v5（Auth.js）への移行を検討してください