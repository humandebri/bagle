# React 19 + NextAuth v4 互換性問題の解決完了

## 実施内容

全ページで`useSession`を`useAuth`に置き換えました。

### 更新したファイル

1. **アカウント関連**
   - ✅ `/app/account/page.tsx`
   - ✅ `/app/account/orders/page.tsx`
   - ✅ `/app/account/profile/page.tsx`

2. **オンラインショップ関連**
   - ✅ `/app/online-shop/review/page.tsx`
   - ✅ `/app/online-shop/success/page.tsx`
   - ✅ `/app/online-shop/checkout/page.tsx`

3. **管理画面関連**
   - ✅ `/app/admin/layout.tsx`
   - ✅ `/app/admin/categories/page.tsx`

### カスタムフックの特徴

`/hooks/useAuth.ts`:
- NextAuthの `/api/auth/session` APIを直接呼び出し
- `useSession`と同じインターフェース（`data`と`status`）を提供
- React 19で正常に動作

### NextAuth v5を使わない理由

1. **移行コストが高い**
   - APIが大幅に変更されている
   - 認証フローの再実装が必要

2. **現在の実装で十分**
   - カスタムフックで問題なく動作
   - 既存のコードへの変更が最小限

3. **安定性**
   - NextAuth v4は安定版
   - v5はまだベータ版

### 注意事項

- `signIn`と`signOut`も`next-auth/react`への依存を削除
- カスタムヘルパー関数`customSignIn`と`customSignOut`を使用（`/lib/auth-helpers.ts`）
- サーバーコンポーネントでは`getServerSession`を使用
- APIルートでは変更不要（`authOptions`をそのまま使用）

### カスタム認証ヘルパー

`/lib/auth-helpers.ts`:
- `customSignIn(provider)` - NextAuthのサインインエンドポイントに直接リダイレクト
- `customSignOut()` - NextAuthのサインアウトAPIを呼び出し

これにより、React 19環境でもNextAuth v4の全機能が正常に動作します。