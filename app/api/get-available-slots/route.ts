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

    // 予約開始制限をかける
    // 各日付について、ちょうど7日前の0時から予約可能
    const filteredTimeSlots = allTimeSlots.filter((slot) => {
      // スロットの日付をJST時刻として解釈
      const slotDateStr = slot.date + 'T00:00:00+09:00'; // JST明示
      const slotDate = new Date(slotDateStr);
      
      // 7日前のJST 0時を正確に計算
      // スロット日付から7日前の日付文字列を作成
      const bookingStartDate = new Date(slotDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      // JST 0:00に設定（日付文字列から再作成）
      const year = bookingStartDate.getFullYear();
      const month = String(bookingStartDate.getMonth() + 1).padStart(2, '0');
      const day = String(bookingStartDate.getDate()).padStart(2, '0');
      const bookingStartDateJST = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
      
      // 現在時刻が予約開始時刻を過ぎているかチェック
      return jstNow >= bookingStartDateJST;
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