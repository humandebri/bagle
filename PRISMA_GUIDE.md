# Prismaマイグレーション管理ガイド

## ✅ セットアップ完了項目

1. **Prismaの基本設定**
   - prisma/schema.prismaファイルを作成
   - 環境変数（DATABASE_URL、DIRECT_URL）を設定
   - package.jsonにPrismaスクリプトを追加
   - .gitignoreを更新

2. **マイグレーション管理**
   - 初期マイグレーションSQL生成（000_init）
   - マイグレーション履歴を登録
   - Prisma Clientを生成
   - API接続テスト完了

3. **検出されたテーブル**
   - categories - 商品カテゴリ
   - orders - 注文情報
   - product_tags - 商品タグ（Row Level Security使用）
   - products - 商品情報
   - profiles - ユーザープロファイル
   - time_slots - 時間枠管理

## 使用方法

### Prismaを使用したデータ取得例

```typescript
// app/api/products-prisma/route.ts を参照
import { prisma } from '@/lib/prisma';

// 商品一覧を取得
const products = await prisma.products.findMany({
  include: {
    categories: true,
  },
  orderBy: {
    created_at: 'desc',
  },
});
```

### 既存のSupabaseクライアントとの比較

**Supabase (現在の実装):**
```typescript
const { data, error } = await supabase
  .from('products')
  .select('*, category:categories(*)')
  .order('created_at', { ascending: false });
```

**Prisma (新しい実装):**
```typescript
const products = await prisma.products.findMany({
  include: { categories: true },
  orderBy: { created_at: 'desc' },
});
```

## 利用可能なコマンド

- `npm run db:generate` - Prisma Clientを再生成
- `npm run db:push` - スキーマ変更をデータベースに反映
- `npm run db:studio` - Prisma Studio（GUI）を起動

## 今後のマイグレーション作成手順

### 新しいマイグレーションを作成する場合

1. **スキーマ変更**
   ```
   # prisma/schema.prismaを編集
   ```

2. **マイグレーションSQL生成**
   ```bash
   # 現在のDBとスキーマの差分を確認
   npx prisma migrate diff \
     --from-schema-datasource prisma/schema.prisma \
     --to-schema-datamodel prisma/schema.prisma \
     --script > temp_migration.sql
   ```

3. **手動でSQLを実行**
   - Supabaseダッシュボード > SQL Editorで生成されたSQLを実行
   - または`npx prisma db push`で直接適用（マイグレーション履歴なし）

## 環境変数の設定

```env
# PgBouncer経由（アプリケーション実行時）
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?pgbouncer=true"

# 直接接続（マイグレーション用）※ポート5432は外部アクセス不可
DIRECT_URL="postgres://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
```

## 注意事項

- Supabaseの直接接続（port 5432）への外部アクセス制限により、`migrate dev`は使用不可
- PgBouncer（port 6543）経由でマイグレーション履歴の管理は可能
- 本番環境での適用はSupabaseダッシュボードまたはCIを推奨

## 今後の移行手順

1. 新しいAPIエンドポイントでPrismaを使用
2. 既存のSupabaseクライアントを段階的にPrismaに置き換え
3. 型安全性とIntelliSenseの恩恵を受ける