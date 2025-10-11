import { create } from 'zustand';
import {
  DEFAULT_SLOT_CATEGORY,
  SlotCategory,
} from '@/lib/categories';

type MenuStore = {
  activeCategory: SlotCategory;
  setActiveCategory: (category: SlotCategory) => void;
};

export const useMenuStore = create<MenuStore>((set) => ({
  activeCategory: DEFAULT_SLOT_CATEGORY,
  setActiveCategory: (category) => set({ activeCategory: category }),
}));
