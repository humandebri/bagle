# 営業日カレンダー管理機能 開発計画

## 概要
営業日カレンダーの管理機能を、t-wadaの理念（TDD、シンプルさ、責任の分離）に従って開発します。

## 開発フェーズ

### Phase 1: データモデル構築 ✅
1. Prismaスキーマに以下のモデルを追加
   - `business_days`: 個別の営業日管理
   - `business_hours`: 曜日別営業時間
   - `recurring_holidays`: 定期休業日パターン
2. マイグレーション実行

### Phase 2: API開発（TDD） ✅
1. テストファースト開発
   - `/api/admin/business-calendar/days` のテスト作成
   - `/api/admin/business-calendar/hours` のテスト作成
   - `/api/admin/business-calendar/recurring-holidays` のテスト作成

2. API実装（次のステップ）
   - 各エンドポイントの実装
   - 認証・認可の実装
   - エラーハンドリング

### Phase 3: 管理画面開発
1. UIコンポーネント開発
   - カレンダータブ（FullCalendar使用）
   - 営業時間タブ
   - 定期休業日タブ

2. モーダルコンポーネント
   - 日付編集モーダル
   - 営業時間編集モーダル
   - パターン編集モーダル

### Phase 4: 統合とテスト
1. フロントエンドのBusinessCalendarコンポーネントとの統合
2. E2Eテストの作成
3. パフォーマンステスト

## ファイル構成

```
app/
├── admin/
│   └── business-calendar/
│       ├── page.tsx                 # メインページ
│       ├── components/
│       │   ├── CalendarTab.tsx
│       │   ├── BusinessHoursTab.tsx
│       │   ├── RecurringHolidaysTab.tsx
│       │   ├── DateEditModal.tsx
│       │   ├── HoursEditModal.tsx
│       │   └── PatternEditModal.tsx
│       └── hooks/
│           └── useBusinessCalendar.ts
│
└── api/
    └── admin/
        └── business-calendar/
            ├── days/
            │   └── route.ts
            ├── hours/
            │   ├── route.ts
            │   └── [dayOfWeek]/
            │       └── route.ts
            ├── recurring-holidays/
            │   ├── route.ts
            │   └── [id]/
            │       └── route.ts
            └── __tests__/
                ├── days.test.ts
                ├── hours.test.ts
                └── recurring-holidays.test.ts
```

## 設計原則

### 1. 単一責任の原則
- 各コンポーネントは1つの責任のみを持つ
- APIルートは1つのリソースのみを扱う

### 2. テストファースト
- 実装前にテストを書く
- テストが通るように実装する

### 3. シンプルさ
- 複雑な抽象化を避ける
- 読みやすく理解しやすいコードを書く

### 4. 型安全性
- TypeScriptの型システムを最大限活用
- Zodなどでランタイムバリデーション

## 次のアクション

1. Prismaマイグレーション実行
   ```bash
   npx prisma migrate dev --name add-business-calendar
   ```

2. API実装開始（テストが先に書かれているので、テストを通すように実装）

3. 管理画面コンポーネントの実装

## 注意事項

- 既存の`time_slots`テーブルとの整合性を保つ
- 営業日判定ロジックは一元化する
- タイムゾーンの扱いに注意（日本時間で統一）

## 管理画面への統合

`app/admin/layout.tsx`のmenuItemsに以下を追加する必要があります：

```typescript
{ name: '営業日カレンダー', href: '/admin/business-calendar', icon: CalendarDaysIcon },
```

※ CalendarDaysIconをimportに追加