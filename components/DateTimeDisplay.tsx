'use client';

type DateTimeDisplayProps = {
  date: string;
  time: string;
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
export function formatTimeRange(startTime: string): string {
  const start = startTime.slice(0, 5) as TimeRangeKey;
  const end = TIME_RANGE_MAP[start];
  return end ? `${start} - ${end}` : start;
}

export function DateTimeDisplay({ date, time, className = '' }: DateTimeDisplayProps) {
  if (!date || !time) return null;

  return (
    <span className={className}>
      お持ち帰り、 {formatDate(date)} {formatTimeRange(time)}
    </span>
  );
} 


export function DateTimeDisplay_order({ date, time, className = '' }: DateTimeDisplayProps) {
  if (!date || !time) return null;

  return (
    <span className={className}>
      {formatDate(date)} {formatTimeRange(time)}
    </span>
  );
} 