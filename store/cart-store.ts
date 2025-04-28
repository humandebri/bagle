// /store/cart-store.ts
import { create } from "zustand";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addToCart: (item) => set((state) => {
    // 同じ商品なら数量を増やすロジック
    const existingItem = state.items.find((i) => i.id === item.id);
    if (existingItem) {
      return {
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      };
    } else {
      return {
        items: [...state.items, item],
      };
    }
  }),
}));
