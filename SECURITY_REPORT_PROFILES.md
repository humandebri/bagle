# 🔒 セキュリティ検査レポート: Profilesテーブル

## 📅 検査日: 2025-08-28

## ⚠️ 重要な問題と推奨事項

### 🔴 クリティカル（重大）

#### 1. **クライアントサイドからの直接データベースアクセス**
**影響範囲: 高**

**問題箇所:**
- `/app/account/profile/page.tsx` (行39, 76)
- `/app/online-shop/checkout/page.tsx` (行61, 129)
- `/app/admin/categories/page.tsx` (行60)

**詳細:**
これらのコンポーネントは、クライアントサイドからSupabaseクライアントを使用して直接profilesテーブルにアクセスしています。

**リスク:**
- ユーザーは開発者ツールでSupabase呼び出しを確認・改ざん可能
- Row Level Security (RLS)が適切に設定されていない場合、他のユーザーのデータにアクセス可能
- APIキーがクライアントに露出

**推奨対策:**
```typescript
// ❌ 現在の実装（危険）
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId);

// ✅ 推奨: サーバーサイドAPIを経由
const response = await fetch('/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### 2. **SELECT * の使用による過剰なデータ露出**
**影響範囲: 高**

**問題箇所:**
- `/app/online-shop/checkout/page.tsx` (行62): `.select('*')`

**詳細:**
`select('*')` は全てのカラムを取得するため、必要以上のデータが露出します。

**推奨対策:**
```typescript
// ❌ 現在
.select('*')

// ✅ 推奨: 必要なフィールドのみ選択
.select('first_name, last_name, phone')
```

### 🟠 高（重要）

#### 3. **認証・認可チェックの不一致**
**影響範囲: 中-高**

**詳細:**
- 一部のAPIルート（`/api/admin/reservations/route.ts`）は適切な認証チェックを実装
- クライアントコンポーネントは認証チェックが不十分

**推奨対策:**
全てのprofilesアクセスで一貫した認証・認可チェックを実装

#### 4. **エラーメッセージの過剰な露出**
**影響範囲: 中**

**問題箇所:**
- 多くのファイルで `console.error()` にエラーの詳細を出力

**リスク:**
- データベース構造やシステム内部の情報が露出
- 攻撃者に有用な情報を提供

**推奨対策:**
```typescript
// ❌ 現在
console.error('プロフィール取得エラー:', error.message);

// ✅ 推奨
if (process.env.NODE_ENV === 'development') {
  console.error('プロフィール取得エラー:', error);
}
// 本番環境では汎用メッセージ
```

### 🟡 中（注意）

#### 5. **クライアントサイドでのデータ検証のみ**
**影響範囲: 中**

**問題箇所:**
- `/app/online-shop/checkout/page.tsx` - クライアント側のみでバリデーション

**推奨対策:**
サーバーサイドでも必ずデータ検証を実施

## ✅ 良好な実装

### 1. **Prismaの使用（一部APIルート）**
- `/api/admin/reservations/route.ts` - Prismaを使用し、必要なフィールドのみselect
- `/api/send-confirmation-email/route.ts` - emailフィールドのみ取得

### 2. **認証チェック（一部実装）**
- `/api/admin/reservations/route.ts` - getServerSessionとrole確認を実装

### 3. **環境変数の使用**
- Supabaseキーは環境変数で管理

## 📋 推奨アクションプラン

### 即座に実施すべき項目
1. **全てのprofilesアクセスをサーバーサイドAPIに移行**
2. **SELECT * を具体的なフィールド指定に変更**
3. **Row Level Security (RLS) ポリシーの実装確認**

### 短期的に実施すべき項目
1. **統一的なエラーハンドリング戦略の実装**
2. **監査ログの実装**
3. **レート制限の実装**

### 中長期的に検討すべき項目
1. **データ暗号化の実装**
2. **GDPR/個人情報保護法への準拠確認**
3. **定期的なセキュリティ監査の実施**

## 🛡️ Supabase RLSポリシー推奨設定

```sql
-- ユーザーは自分のプロフィールのみ読み取り可能
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全てのプロフィールを読み取り可能
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
```

## 📊 リスクマトリックス

| リスクレベル | 件数 | 対応優先度 |
|------------|------|-----------|
| クリティカル | 2 | 即座 |
| 高 | 2 | 48時間以内 |
| 中 | 1 | 1週間以内 |
| 低 | 0 | - |

## 🎯 結論

profilesテーブルのセキュリティには**重大な問題**があります。特に：

1. **クライアントサイドからの直接アクセス**は最も深刻な問題
2. **SELECT ***による過剰なデータ取得
3. **認証・認可の不一致**

これらの問題は個人情報漏洩のリスクが高いため、**即座の対応が必要**です。

推奨される最優先アクション：
1. すべてのprofilesアクセスをサーバーサイドAPIに移行
2. Supabase RLSポリシーの即座の実装
3. クライアントサイドコードの監査と修正

---
*このレポートは2025年08月28日時点のコードベースに基づいています。*