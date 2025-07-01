import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { MAX_BAGEL_PER_ORDER, MAX_BAGEL_PER_ITEM } from "@/lib/constants";

// カートアイテム型
export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

// カートストアの型
type CartState = {
  items: CartItem[];
  dispatchDate: string | null;
  dispatchTime: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDispatchDate: (date: string | null) => void;
  setDispatchTime: (time: string | null) => void;
  reset: () => void;
};

// 初期受け取り日時
export const initialDispatchDate = null;
export const initialDispatchTime = null;

// Zustandストア
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      dispatchDate: initialDispatchDate,
      dispatchTime: initialDispatchTime,

      addItem: (item) =>
        set((state) => {
          // 既存の商品を削除してから新しい個数で追加
          const filteredItems = state.items.filter((i) => i.id !== item.id);
          return {
            items: [...filteredItems, item],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id || quantity > 0).map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        })),

      clearCart: () => set({ items: [] }),

      setDispatchDate: (date) => set({ dispatchDate: date }),

      setDispatchTime: (time) => set({ dispatchTime: time }),

      reset: () =>
        set({
          items: [],
          dispatchDate: initialDispatchDate,
          dispatchTime: initialDispatchTime,
        }),
    }),
    {
      name: "cart-storage",
    }
  )
);
