'use client';

type DateTimeDisplayProps = {
  date: string;
  time: string;
  endTime?: string | null;
  className?: string;
};

export const TIME_RANGE_MAP = {
  '11:00': '11:15',
  '11:15': '11:30',
  '11:30': '11:45',
  '11:45': '12:00',
  '12:00': '15:00',
} as const;

type TimeRangeKey = keyof typeof TIME_RANGE_MAP;

/** 日付を日本語形式に変換 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return '';
  }
}

/** 時間範囲を表示形式に変換 */
export function formatTimeRange(startTime: string, endTime?: string | null): string {
  const normalizedStart = startTime.slice(0, 5);
  if (endTime) {
    const normalizedEnd = endTime.slice(0, 5);
    return `${normalizedStart} - ${normalizedEnd}`;
  }
  const fallbackKey = normalizedStart as TimeRangeKey;
  const fallback = TIME_RANGE_MAP[fallbackKey];
  return fallback ? `${normalizedStart} - ${fallback}` : normalizedStart;
}

export function DateTimeDisplay({ date, time, endTime, className = '' }: DateTimeDisplayProps) {
  if (!date || !time) return null;

  return (
    <span className={className}>
      お持ち帰り、 {formatDate(date)} {formatTimeRange(time, endTime)}
    </span>
  );
}

export function DateTimeDisplay_order({ date, time, endTime, className = '' }: DateTimeDisplayProps) {
  if (!date || !time) return null;

  return (
    <span className={className}>
      {formatDate(date)} {formatTimeRange(time, endTime)}
    </span>
  );
}
