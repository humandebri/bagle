import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 現在の日時を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 明後日から1週間後までの予約枠を取得（当日・翌日予約は不可）
    const dayAfterTomorrow = new Date(jstNow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2); // 明後日
    dayAfterTomorrow.setHours(0, 0, 0, 0);
    
    const oneWeekFromDayAfterTomorrow = new Date(dayAfterTomorrow);
    oneWeekFromDayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 6); // 明後日から6日後まで（計7日分）

    const { data: allTimeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .gte('date', dayAfterTomorrow.toISOString().split('T')[0])
      .lte('date', oneWeekFromDayAfterTomorrow.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      throw error;
    }

    // 予約開始制限をかける & 満員の枠を除外
    // 各日付について、ちょうど7日前の0時から予約可能
    const filteredTimeSlots = allTimeSlots.filter((slot) => {
      // ① 満員チェック（current_bookings >= max_capacity なら除外）
      if (slot.current_bookings >= slot.max_capacity) {
        return false;
      }

      // ② 「スロット日の JST 00:00」を "絶対時刻" として取得（UTCに固定される）
      const slotStartJSTMs = Date.parse(`${slot.date}T00:00:00+09:00`);

      // ③ そこから 7 日（JSTはDSTが無いので 86400000ms×7 でOK）さかのぼる
      const bookingStartJSTMs = slotStartJSTMs - 7 * 24 * 60 * 60 * 1000;

      // ④ いま（UTCの現在時刻）と絶対時刻（JST 00:00 相当）を ms で比較
      return Date.now() >= bookingStartJSTMs;
    });

    return NextResponse.json({ 
      timeSlots: filteredTimeSlots,
      currentTime: jstNow.toISOString(),
      message: '各日の予約は7日前の同じ曜日0時から開始されます（当日・翌日予約不可）'
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: '予約枠の取得に失敗しました' }, { status: 500 });
  }
} 