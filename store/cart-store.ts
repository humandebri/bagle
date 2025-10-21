import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SLOT_CATEGORY,
  SlotCategory,
} from "@/lib/categories";


// カートアイテム型
export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: {
    name: string;
  };
};

// カートストアの型
type CartState = {
  items: CartItem[];
  dispatchDate: string | null;
  dispatchTime: string | null;
  dispatchEndTime: string | null;
  dispatchCategory: SlotCategory;
  dispatchHoldSessionId: string | null;
  dispatchHoldExpiresAt: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDispatchDate: (date: string | null) => void;
  setDispatchTime: (time: string | null, endTime?: string | null) => void;
  setDispatchCategory: (category: SlotCategory | null) => void;
  setDispatchHold: (
    payload: { sessionId: string; expiresAt: string } | null,
  ) => void;
  reset: () => void;
};

// 初期受け取り日時
export const initialDispatchDate = null;
export const initialDispatchTime = null;
export const initialDispatchCategory = DEFAULT_SLOT_CATEGORY;

// Zustandストア
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      dispatchDate: initialDispatchDate,
      dispatchTime: initialDispatchTime,
      dispatchEndTime: null,
      dispatchCategory: initialDispatchCategory,
      dispatchHoldSessionId: null,
      dispatchHoldExpiresAt: null,

      addItem: (item) =>
        set((state) => {
          // 既存の商品を削除してから新しい個数で追加
          const filteredItems = state.items.filter((i) => i.id !== item.id);
          return {
            items: [...filteredItems, item],
          };
        }),

      removeItem: (id) =>
        set((state) => {
          const nextItems = state.items.filter((i) => i.id !== id);
          if (nextItems.length === 0) {
            return {
              items: [],
              dispatchDate: initialDispatchDate,
              dispatchTime: initialDispatchTime,
              dispatchEndTime: null,
              dispatchCategory: initialDispatchCategory,
              dispatchHoldSessionId: null,
              dispatchHoldExpiresAt: null,
            };
          }
          return { items: nextItems };
        }),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const nextItems = state.items
            .filter((i) => i.id !== id || quantity > 0)
            .map((i) => (i.id === id ? { ...i, quantity } : i));
          const filteredItems = nextItems.filter((i) => i.quantity > 0);
          if (filteredItems.length === 0) {
            return {
              items: [],
              dispatchDate: initialDispatchDate,
              dispatchTime: initialDispatchTime,
              dispatchEndTime: null,
              dispatchCategory: initialDispatchCategory,
              dispatchHoldSessionId: null,
              dispatchHoldExpiresAt: null,
            };
          }
          return { items: filteredItems };
        }),

      clearCart: () =>
        set({
          items: [],
          dispatchDate: initialDispatchDate,
          dispatchTime: initialDispatchTime,
          dispatchEndTime: null,
          dispatchCategory: initialDispatchCategory,
          dispatchHoldSessionId: null,
          dispatchHoldExpiresAt: null,
        }),

      setDispatchDate: (date) =>
        set((state) => ({
          dispatchDate: date,
          ...(date === null ? { dispatchEndTime: null, dispatchTime: initialDispatchTime } : {}),
          ...(date === null
            ? { dispatchCategory: initialDispatchCategory }
            : { dispatchCategory: state.dispatchCategory }),
          ...(date === null
            ? { dispatchHoldSessionId: null, dispatchHoldExpiresAt: null }
            : {}),
        })),

      setDispatchTime: (time, endTime = null) =>
        set({
          dispatchTime: time,
          dispatchEndTime: endTime,
        }),

      setDispatchCategory: (category) =>
        set({
          dispatchCategory: category ?? initialDispatchCategory,
        }),

      setDispatchHold: (payload) =>
        set({
          dispatchHoldSessionId: payload?.sessionId ?? null,
          dispatchHoldExpiresAt: payload?.expiresAt ?? null,
        }),

      reset: () =>
        set({
          items: [],
          dispatchDate: initialDispatchDate,
          dispatchTime: initialDispatchTime,
          dispatchEndTime: null,
          dispatchCategory: initialDispatchCategory,
          dispatchHoldSessionId: null,
          dispatchHoldExpiresAt: null,
        }),
    }),
    {
      name: "cart-storage",
    }
  )
);
