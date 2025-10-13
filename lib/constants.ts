import {
  SLOT_CATEGORY_RICE_FLOUR,
  SLOT_CATEGORY_STANDARD,
  type SlotCategory,
} from './categories';

export const MAX_BAGEL_PER_ORDER_STANDARD = 12;
export const MAX_BAGEL_PER_ORDER_RICE_FLOUR = 6;

export const MAX_BAGEL_PER_ORDER = MAX_BAGEL_PER_ORDER_STANDARD;
export const MAX_BAGEL_PER_ORDER_BY_CATEGORY: Record<SlotCategory, number> = {
  [SLOT_CATEGORY_STANDARD]: MAX_BAGEL_PER_ORDER_STANDARD,
  [SLOT_CATEGORY_RICE_FLOUR]: MAX_BAGEL_PER_ORDER_RICE_FLOUR,
};

export const MAX_BAGEL_PER_ITEM = 3;
export const MAX_BAGEL_PER_ITEM_FILLING = 3; // フィリングベーグル用の制限
export const STORE_PHONE_NUMBER = '089-904-2666';

export function getMaxBagelPerOrder(
  category?: SlotCategory | null,
): number {
  if (!category) {
    return MAX_BAGEL_PER_ORDER_STANDARD;
  }
  return (
    MAX_BAGEL_PER_ORDER_BY_CATEGORY[category] ??
    MAX_BAGEL_PER_ORDER_STANDARD
  );
}
