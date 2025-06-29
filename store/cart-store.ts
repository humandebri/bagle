import { create } from "zustand";
import { persist } from "zustand/middleware";

// 商品の型定義
// 本来はtypes/index.tsなどに定義すべきだが、一時的にここに置く
export type Product = {
  id: string;
  name: string;
  description: string;
  long_description: string;
  price: number;
  image: string | null;
  is_available: boolean;
  is_limited: boolean;
  start_date: string | null;
  end_date: string | null;
  category: {
    name: string;
  };
};

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
  selectedProduct: Product | null; // 選択中の商品を保持
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDispatchDate: (date: string | null) => void;
  setDispatchTime: (time: string | null) => void;
  setSelectedProduct: (product: Product | null) => void; // 選択中の商品をセット
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
      selectedProduct: null,

      addItem: (item) =>
        set((state) => {
          // 既存の商品を削除してから新しい個数で追加
          const filteredItems = state.items.filter((i) => i.id !== item.id);
          const currentTotal = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
          
          // 合計数量チェック（MAX_BAGEL_PER_ORDER = 8）
          if (currentTotal + item.quantity > 8) {
            // 制限を超える場合は追加しない
            console.warn(`Cannot add item: would exceed maximum order limit of 8 bagels`);
            return state;
          }
          
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
      
      setSelectedProduct: (product) => set({ 
        selectedProduct: product ? {
          ...product,
          image: (!product.image || product.image.trim() === '') ? null : product.image
        } : null 
      }),

      reset: () =>
        set({
          items: [],
          dispatchDate: initialDispatchDate,
          dispatchTime: initialDispatchTime,
          selectedProduct: null,
        }),
    }),
    {
      name: "cart-storage",
      // selectedProductは永続化から除外
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => key !== 'selectedProduct')
        ),
    }
  )
);
