// 定期休業日パターンの判定ユーティリティ

interface RecurringHolidayPattern {
  type: 'weekly' | 'monthly';
  pattern: {
    week?: number;
    dayOfWeek: number;
  };
  is_active: boolean;
}

interface BusinessHours {
  day_of_week: number;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

// 指定された日付が定期休業日かどうかをチェック
export function isRecurringHoliday(
  date: Date,
  recurringPatterns: RecurringHolidayPattern[]
): boolean {
  const dayOfWeek = date.getDay();
  
  for (const pattern of recurringPatterns) {
    if (!pattern.is_active) continue;
    
    if (pattern.type === 'weekly') {
      // 毎週のパターン
      if (pattern.pattern.dayOfWeek === dayOfWeek) {
        return true;
      }
    } else if (pattern.type === 'monthly') {
      // 毎月のパターン（第N週の特定曜日）
      if (pattern.pattern.dayOfWeek === dayOfWeek && pattern.pattern.week) {
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        if (weekOfMonth === pattern.pattern.week) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// 営業時間から定休日かどうかをチェック
export function isRegularHoliday(
  date: Date,
  businessHours: BusinessHours[]
): boolean {
  const dayOfWeek = date.getDay();
  const hours = businessHours.find(h => h.day_of_week === dayOfWeek);
  
  return hours?.is_closed || false;
}

// 期間内の全日付を生成
export function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// 営業日情報を生成
export function generateBusinessDayInfo(
  date: Date,
  businessDays: Map<string, any>,
  businessHours: BusinessHours[],
  recurringPatterns: RecurringHolidayPattern[]
) {
  const dateStr = date.toISOString().split('T')[0];
  const existingDay = businessDays.get(dateStr);
  
  // business_daysテーブルに既存のデータがあればそれを優先
  if (existingDay) {
    return existingDay;
  }
  
  // 定休日チェック
  const isRegHoliday = isRegularHoliday(date, businessHours);
  const isRecHoliday = isRecurringHoliday(date, recurringPatterns);
  
  return {
    date: dateStr,
    is_open: !isRegHoliday && !isRecHoliday,
    is_special: false,
    notes: null
  };
}