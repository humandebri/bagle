# Prismaマイグレーションの問題と解決方法

## 問題の原因

### 1. UUID関数の不一致
- **問題**: データベースは `uuid_generate_v4()` を使用、Prismaは `gen_random_uuid()` を期待
- **原因**: 
  - PostgreSQL 13以降では `gen_random_uuid()` が標準
  - Supabaseは古い `uuid-ossp` 拡張を使用している
  - 既存のテーブルが `uuid_generate_v4()` で作成されている

### 2. マイグレーション履歴の不整合
- **問題**: 既存のマイグレーションファイルを編集したため、データベースとの同期が崩れた
- **原因**:
  - `000_init` マイグレーションは既に適用済み
  - ファイルを編集したため、Prismaが差分を検出

### 3. Shadow Database エラー
- **問題**: Shadow databaseでマイグレーションのテストが失敗
- **原因**:
  - Shadow databaseに `uuid-ossp` 拡張がインストールされていない
  - SupabaseのPgBouncerを経由しているため、拡張機能の管理に制限がある

### 4. Supabase + Prismaの特殊性
- **問題**: SupabaseとPrismaの組み合わせには特別な設定が必要
- **原因**:
  - Supabaseは管理されたPostgreSQLサービス
  - Row Level Security (RLS) がデフォルトで有効
  - PgBouncerによる接続プーリング

## 解決方法

### 方法1: Supabaseで直接テーブルを作成（推奨）
```bash
# 1. Supabaseダッシュボードで SQL を実行
# app/admin/business-calendar/sql/create_tables_supabase.sql を使用

# 2. 既存のスキーマをPrismaに取り込む
npx prisma db pull

# 3. Prismaクライアントを生成
npx prisma generate
```

### 方法2: 既存のマイグレーションをリセット（データが失われる）
```bash
# 警告: すべてのデータが削除されます！
npx prisma migrate reset

# 新しいマイグレーションを作成
npx prisma migrate dev
```

### 方法3: 手動でマイグレーションを管理
```bash
# 1. マイグレーションファイルのみ作成
npx prisma migrate dev --create-only

# 2. 生成されたSQLを手動で編集
# uuid_generate_v4() を使用するように変更

# 3. Supabaseで手動実行

# 4. マイグレーションを適用済みとしてマーク
npx prisma migrate resolve --applied [migration_name]
```

## なぜこの問題が発生するのか

1. **Prismaの期待値**
   - Prismaは完全なデータベース制御を前提に設計
   - 新規プロジェクトでの使用を想定

2. **Supabaseの制約**
   - 事前設定された環境
   - RLSやエクステンションが既に有効
   - 管理者権限の制限

3. **既存プロジェクトの問題**
   - 既にデータが存在
   - 手動で作成されたテーブル
   - Prismaの管理外で行われた変更

## 推奨される開発フロー

### 新規プロジェクトの場合
1. Prismaでスキーマ定義
2. マイグレーション作成・実行
3. Supabaseの機能（RLS等）を後から追加

### 既存プロジェクトの場合（現在の状況）
1. Supabaseで直接テーブル作成
2. `prisma db pull` でスキーマ同期
3. 今後の変更はPrismaで管理

## 今回のプロジェクトでの最適解

既存のデータとテーブルがあるため：

1. **Supabaseダッシュボードで直接実行**
   - `sql/create_tables_supabase.sql` を使用
   - データの損失なし
   - 即座に使用可能

2. **Prismaスキーマの同期**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

3. **初期データの投入**
   ```bash
   npx tsx prisma/seed-business-calendar.ts
   ```

この方法が最も安全で確実です。