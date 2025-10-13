import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  normalizeSlotCategory,
  isSlotCategory,
  SLOT_CATEGORY_RICE_FLOUR,
} from '@/lib/categories';
import { isTimeRangeWithinCategory } from '@/lib/slot-rules';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const filteredCategory = isSlotCategory(categoryParam)
      ? normalizeSlotCategory(categoryParam)
      : null;
    
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

    // 仮予約数を取得（slot_reservationsテーブル）
    const { data: tempReservations } = await supabase
      .from('slot_reservations')
      .select('date, time')
      .gte('expires_at', new Date().toISOString());

    // テーブルが存在しない場合もあるのでnullチェック
    const reservations = tempReservations || [];

    // 各time_slotに仮予約数を追加
    const timeSlotsWithTemp = allTimeSlots?.map(slot => {
      // 仮予約数をカウント
      const tempCount = reservations.filter(res => {
        const resDateStr = typeof res.date === 'string' 
          ? res.date 
          : new Date(res.date).toISOString().split('T')[0];
        const resTimeStr = typeof res.time === 'string' 
          ? res.time.slice(0, 8) 
          : new Date(res.time).toISOString().split('T')[1].slice(0, 8);
        return resDateStr === slot.date && resTimeStr === slot.time;
      }).length || 0;

      return {
        ...slot,
        temp_bookings: tempCount  // 仮予約数を追加
      };
    }) || [];

    // 予約開始制限をかける & 満員の枠を除外
    // 各日付について、ちょうど7日前の0時から予約可能
    const filteredTimeSlots = timeSlotsWithTemp.filter((slot) => {
      const slotCategory = normalizeSlotCategory(slot.allowed_category);
      if (filteredCategory && slotCategory !== filteredCategory) {
        return false;
      }

      // ① 満員チェック（current_bookings + temp_bookings >= max_capacity なら除外）
      if ((slot.current_bookings + (slot.temp_bookings || 0)) >= slot.max_capacity) {
        return false;
      }

      // ② 「スロット日の JST 00:00」を "絶対時刻" として取得（UTCに固定される）
      const slotStartJSTMs = Date.parse(`${slot.date}T00:00:00+09:00`);

      // ③ そこから 7 日（JSTはDSTが無いので 86400000ms×7 でOK）さかのぼる
      const bookingStartJSTMs = slotStartJSTMs - 7 * 24 * 60 * 60 * 1000;

      // ④ いま（UTCの現在時刻）と絶対時刻（JST 00:00 相当）を ms で比較
      if (Date.now() < bookingStartJSTMs) {
        return false;
      }

      // ⑤ カテゴリ特有の営業時間制約
      if (
        slotCategory === SLOT_CATEGORY_RICE_FLOUR &&
        !isTimeRangeWithinCategory(
          slotCategory,
          slot.time.slice(0, 5),
          slot.end_time.slice(0, 5),
        )
      ) {
        return false;
      }

      return true;
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
