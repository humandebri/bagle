// 入力検証ユーティリティ

// 日付フォーマット検証（YYYY-MM-DD）
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

// 時間フォーマット検証（HH:MM）
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// 許可された時間スロット
const ALLOWED_TIME_SLOTS = [
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '13:00', '14:00'
];

export function isAllowedTimeSlot(time: string): boolean {
  return ALLOWED_TIME_SLOTS.includes(time);
}

// 正の整数検証
export function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// メールアドレス検証
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 電話番号検証（日本）
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}|0[789]0-?[0-9]{4}-?[0-9]{4})$/;
  return phoneRegex.test(phone);
}

// UUID検証
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 文字列長検証
export function isValidStringLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

// 安全な文字列検証（SQLインジェクション対策）
export function isSafeString(str: string): boolean {
  // 危険な文字を含まないことを確認
  const dangerousPatterns = [
    /[;'"\\]/,  // SQLインジェクションに使われる文字
    /<script/i,  // XSS
    /javascript:/i,  // XSS
    /on\w+=/i,  // イベントハンドラ
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(str));
}

// 価格検証
export function isValidPrice(price: unknown): boolean {
  return typeof price === 'number' && price >= 0 && price <= 1000000;
}

// 数量検証
export function isValidQuantity(quantity: unknown, max: number = 100): boolean {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0 && quantity <= max;
}