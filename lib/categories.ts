export const SLOT_CATEGORY_STANDARD = 'standard' as const;
export const SLOT_CATEGORY_RICE_FLOUR = 'rice_flour' as const;

export type SlotCategory =
  | typeof SLOT_CATEGORY_STANDARD
  | typeof SLOT_CATEGORY_RICE_FLOUR;

export const DEFAULT_SLOT_CATEGORY: SlotCategory = SLOT_CATEGORY_STANDARD;

export const ALLOWED_SLOT_CATEGORIES: SlotCategory[] = [
  SLOT_CATEGORY_STANDARD,
  SLOT_CATEGORY_RICE_FLOUR,
];

export const SLOT_CATEGORY_LABELS: Record<SlotCategory, string> = {
  [SLOT_CATEGORY_STANDARD]: 'BAGEL(税込価格)',
  [SLOT_CATEGORY_RICE_FLOUR]: '米粉ベーグル',
};

const PRODUCT_CATEGORY_TO_SLOT_CATEGORY: Record<string, SlotCategory> = {
  '米粉ベーグル': SLOT_CATEGORY_RICE_FLOUR,
};

export const SLOT_CATEGORY_OPTIONS = ALLOWED_SLOT_CATEGORIES.map((value) => ({
  value,
  label: SLOT_CATEGORY_LABELS[value],
}));

export function isSlotCategory(value: unknown): value is SlotCategory {
  if (typeof value !== 'string') return false;
  return (ALLOWED_SLOT_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeSlotCategory(category?: string | null): SlotCategory {
  if (!category) return SLOT_CATEGORY_STANDARD;
  return isSlotCategory(category) ? category : SLOT_CATEGORY_STANDARD;
}

export function inferSlotCategoryFromProductCategory(
  categoryName?: string | null,
): SlotCategory {
  if (!categoryName) return SLOT_CATEGORY_STANDARD;
  return (
    PRODUCT_CATEGORY_TO_SLOT_CATEGORY[categoryName] ?? SLOT_CATEGORY_STANDARD
  );
}

export function isProductAllowedInSlot(
  productCategoryName: string | undefined,
  slotCategory: SlotCategory | null | undefined,
): boolean {
  if (!slotCategory || slotCategory === SLOT_CATEGORY_STANDARD) {
    return true;
  }
  return (
    inferSlotCategoryFromProductCategory(productCategoryName) === slotCategory
  );
}
