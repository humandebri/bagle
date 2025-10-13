import {
  SLOT_CATEGORY_RICE_FLOUR,
  SLOT_CATEGORY_STANDARD,
  type SlotCategory,
} from '@/lib/categories';

type SlotDefinition = {
  start: string;
  end: string;
  max: number;
};

type SlotRule = {
  allowedRange: { start: string; end: string };
  defaultSlots: SlotDefinition[];
};

export const SLOT_CATEGORY_RULES: Record<SlotCategory, SlotRule> = {
  [SLOT_CATEGORY_STANDARD]: {
    allowedRange: { start: '11:00', end: '15:00' },
    defaultSlots: [
      { start: '11:00', end: '11:15', max: 1 },
      { start: '11:15', end: '11:30', max: 1 },
      { start: '11:30', end: '11:45', max: 1 },
      { start: '11:45', end: '12:00', max: 1 },
      { start: '12:00', end: '15:00', max: 6 },
    ],
  },
  [SLOT_CATEGORY_RICE_FLOUR]: {
    allowedRange: { start: '11:00', end: '14:00' },
    defaultSlots: [{ start: '11:00', end: '14:00', max: 2 }],
  },
};

export function getSlotRule(category: SlotCategory): SlotRule {
  return SLOT_CATEGORY_RULES[category];
}

function toComparable(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function isTimeRangeWithinCategory(
  category: SlotCategory,
  start: string,
  end: string,
): boolean {
  const { allowedRange } = getSlotRule(category);
  const startMinutes = toComparable(start);
  const endMinutes = toComparable(end);
  return (
    startMinutes >= toComparable(allowedRange.start) &&
    endMinutes <= toComparable(allowedRange.end) &&
    endMinutes > startMinutes
  );
}
