import { create } from "zustand";
import { toast } from 'sonner';


type CartItem = {
  id: string; // ← UUID対応
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  dispatchDate: string;
  dispatchTime: string;
  addToCart: (item: CartItem) => void;
  setDispatchInfo: (date: string, time: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeFromCart: (id: string) => void;
};

// --- 初期配送情報 ---
const initialDispatchDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 2); // 2日後
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
})();
const initialDispatchTime = "11:00";

const maxbagel = 8;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  dispatchDate: initialDispatchDate,
  dispatchTime: initialDispatchTime,

  addToCart: (item) => {
    const state = get();
    const totalQuantity = state.items.reduce((sum, i) => sum + i.quantity, 0);

    if (totalQuantity + item.quantity > maxbagel) {
      toast('予約できる個数は最大8個までです！', {
        description: 'お一人様8個までご予約いただけます。',
      });
      return;
    }

    const existingItem = state.items.find((i) => i.id === item.id);
    if (existingItem) {
      set({
        items: state.items.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      });
    } else {
      set({ items: [...state.items, item] });
    }
  },

  setDispatchInfo: (date, time) =>
    set(() => ({
      dispatchDate: date,
      dispatchTime: time,
    })),

  increaseQuantity: (id) =>
    set((state) => {
      const totalQuantity = state.items.reduce((sum, i) => sum + i.quantity, 0);

      if (totalQuantity >= maxbagel) {
        toast(`予約できる個数は最大${maxbagel}個までです！`, {
          description: `お一人様${maxbagel}個までご予約いただけます。`,
        });
        return state; // 変更せず返す
      }

      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      };
    }),

  decreaseQuantity: (id) =>
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.id === id) {
            return item.quantity > 1
              ? { ...item, quantity: item.quantity - 1 }
              : null; // 数量1なら削除
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null),
    })),

  removeFromCart: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
