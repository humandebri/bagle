// /store/cart-store.ts
import { create } from "zustand";
import { toast } from "sonner";

type CartItem = {
  id: number;
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
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  removeFromCart: (id: number) => void; // ← これを追加！
};
/* --- 初期値を作る関数 --- */
const initialDispatchDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 2); // 2日後
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
})();
const initialDispatchTime = "11:00"; // 固定
const maxbagel = 8;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  dispatchDate: initialDispatchDate,
  dispatchTime: initialDispatchTime,


  addToCart: (item) => {
    const state = get();
    const totalQuantity = state.items.reduce((sum, i) => sum + i.quantity, 0);

    if (totalQuantity + item.quantity > maxbagel) {
      toast(`予約できる個数は最大${maxbagel}個までです！`, {
        description: `お一人様${maxbagel}個までご予約いただけます。`,
        type: "error", // or variant: "destructive" depending on sonner version
      });
      return ; 
    }

    const existingItem = state.items.find((i) => i.id === item.id);
    if (existingItem) {
      return set({
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      });
    } else {
      return set({
        items: [...state.items, item],
      });
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
          type: "error",
        });
        return state; // ← 変更せずにそのまま返す
      }
  
      return {
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      };
    }),
  
  decreaseQuantity: (id) =>
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.id === id) {
            if (item.quantity > 1) {
              return { ...item, quantity: item.quantity - 1 };
            } else {
              return null; // 数量1の場合はnull返してあとでフィルター
            }
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null), // nullを削除
    })),

  removeFromCart: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

}));

