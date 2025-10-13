# 🍞 Time Slot Category Extension Design

_米粉ベーグル限定日対応設計（将来のカテゴリ対応を含む）_

---

## 目的

`time_slots` にカテゴリ属性を追加し、特定カテゴリ（例: 米粉ベーグル）専用の日・時間帯を柔軟に管理できるようにする。

この設計により：

- オンラインショップ側でカテゴリ限定スロットを制御可能
- 管理画面で限定日を設定可能
- 将来的な「イベント限定日」「グルテンフリー日」などにも対応可能

---

## データモデル

### テーブル変更

#### Migration (SQL)

```sql
ALTER TABLE time_slots
ADD COLUMN allowed_category TEXT DEFAULT 'standard' NOT NULL;
```

※将来的に複数カテゴリ対応したい場合は以下も検討：

```sql
ALTER TABLE time_slots
ADD COLUMN allowed_categories TEXT[] DEFAULT ARRAY['standard'];
```

#### Prisma Schema (例)

```prisma
model TimeSlot {
  id                Int      @id @default(autoincrement())
  start_time        Time
  end_time          Time
  date              Date
  capacity          Int
  allowed_category  String   @default("standard") // e.g. 'standard', 'rice_flour', 'event'
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

---

## API 設計

### `/api/get-available-slots`

- **クエリパラメータ**に `category` を追加  
  例: `/api/get-available-slots?category=rice_flour`

- **レスポンス例**

```json
[
  {
    "id": 12,
    "date": "2025-10-13",
    "start_time": "10:00",
    "end_time": "12:00",
    "capacity": 10,
    "allowed_category": "rice_flour"
  }
]
```

- **ロジック**

  - category指定がある場合 → 該当categoryのスロットのみ返す
  - 指定なし → 全スロット返す（admin用途）

---

### `/api/time_slots` (GET/POST/PUT)

- `allowed_category` を含めて入出力
- バリデーション例（POST時）：

  ```ts
  const validCategories = ['standard', 'rice_flour', 'event'];
  if (!validCategories.includes(req.body.allowed_category)) {
    throw new Error('Invalid category');
  }
  ```

---

### `/api/update-time-slot`

- カートやUIから送信される予約リクエスト時にカテゴリ整合性チェックを行う

  ```ts
  if (selectedSlot.allowed_category !== currentCart.category) {
    return error('Slot category mismatch');
  }
  ```

---

## フロントエンド構成

### Zustand Store

`useMenuStore.ts`:

```ts
import { create } from 'zustand';

type MenuTab = 'standard' | 'rice_flour' | 'event';

interface MenuStore {
  activeTab: MenuTab;
  setActiveTab: (tab: MenuTab) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  activeTab: 'standard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

`useDispatchStore.ts`:

```ts
import { create } from 'zustand';
import type { TimeSlot } from '@/types';

interface DispatchStore {
  selectedSlot: TimeSlot | null;
  setSlot: (slot: TimeSlot) => void;
}

export const useDispatchStore = create<DispatchStore>((set) => ({
  selectedSlot: null,
  setSlot: (slot) => set({ selectedSlot: slot }),
}));
```

`useMenuStore` と `useDispatchStore` は subscribe で連動：

```ts
useDispatchStore.subscribe((state) => {
  if (state.selectedSlot?.allowed_category === 'rice_flour') {
    useMenuStore.getState().setActiveTab('rice_flour');
  } else {
    useMenuStore.getState().setActiveTab('standard');
  }
});
```

---

## フロントUI設計

### `app/online-shop/page.tsx`

- タブボタン2つを設置：

  ```tsx
  <div className="flex gap-2">
    <Button variant={activeTab === 'standard' ? 'default' : 'outline'} onClick={() => setActiveTab('standard')}>
      BAGEL(税込価格)
    </Button>
    <Button variant={activeTab === 'rice_flour' ? 'default' : 'outline'} onClick={() => setActiveTab('rice_flour')}>
      米粉ベーグル
    </Button>
  </div>
  ```

- `useEffect`で`activeTab`が変わったらAPIを再取得：

  ```ts
  useEffect(() => {
    fetch(`/api/get-available-slots?category=${activeTab}`)
      .then((r) => r.json())
      .then(setAvailableSlots);
  }, [activeTab]);
  ```

- 商品リストは `BagelMenu` にカテゴリごとの配列を渡す：

  ```tsx
  <BagelMenu products={products.filter((p) => p.category.name === activeTab)} />
  ```

---

### `app/online-shop/@modal/dispatch/page.tsx`

- スロット一覧取得時に、`activeTab` を考慮してフィルタ
- 選択したスロットの `allowed_category` に応じて自動タブ切り替え

---

## 管理画面 (app/admin/time_slots/page.tsx)

- 一括登録/編集フォームにカテゴリ選択フィールドを追加（`Select` または `Chip`）

  ```tsx
  <Select onValueChange={(v) => setAllowedCategory(v)}>
    <SelectItem value="standard">通常販売</SelectItem>
    <SelectItem value="rice_flour">米粉限定</SelectItem>
    <SelectItem value="event">イベント限定</SelectItem>
  </Select>
  ```

- カレンダーセルにカテゴリごとの色分け:

  ```tsx
  const color = CATEGORY_COLORS[slot.allowed_category];
  <Badge variant={color}>{slot.allowed_category}</Badge>
  ```

---

## カテゴリカラー定義

```ts
export const CATEGORY_COLORS = {
  standard: 'neutral',
  rice_flour: 'amber',
  event: 'purple',
};
```

---

## バリデーション共通化

`utils/category.ts`:

```ts
export function isProductAllowedInSlot(productCategory: string, slotCategory: string) {
  return slotCategory === 'standard' || productCategory === slotCategory;
}
```

---

## テスト項目

- [x] 通常タブで米粉枠が非表示
- [x] 米粉タブで通常枠が非表示
- [x] 米粉枠選択時にタブが固定
- [x] カートにカテゴリ不一致商品を追加できない
- [x] 管理画面でカテゴリ一括設定・解除できる
- [x] APIでカテゴリ不整合時にエラーを返す

---

## 今後の拡張案

- カテゴリごとの販売上限（例: `max_per_category`）
- 特定カテゴリ限定の送料・割引ルール
- UIテーマをカテゴリで切り替え（`themeVariantByCategory`）

---

## 結論

単一フラグ（boolean）ではなく **カテゴリ属性（string）** を導入することで、米粉限定日だけでなく将来的な「販売カテゴリ別スロット制御」を統一的に扱える。

この設計はDB→API→状態管理→UIの全レイヤーで整合性が取れており、拡張にも強く、テスト容易性も高い。
