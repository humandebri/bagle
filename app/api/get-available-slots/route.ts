import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 現在の日時を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 明日から1週間後までの予約枠を取得（当日予約は不可）
    const tomorrow = new Date(jstNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const oneWeekFromTomorrow = new Date(tomorrow);
    oneWeekFromTomorrow.setDate(tomorrow.getDate() + 6); // 明日から6日後まで（計7日分）

    const { data: allTimeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .gte('date', tomorrow.toISOString().split('T')[0])
      .lte('date', oneWeekFromTomorrow.toISOString().split('T')[0])
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
      
      // スロットの日付のちょうど7日前の0時を計算（予約開始時刻）
      const bookingStartDate = new Date(slotDate);
      bookingStartDate.setDate(bookingStartDate.getDate() - 7);
      bookingStartDate.setHours(0, 0, 0, 0);
      
      // 現在時刻が予約開始時刻を過ぎているかチェック
      return jstNow >= bookingStartDate;
    });

    return NextResponse.json({ 
      timeSlots: filteredTimeSlots,
      currentTime: jstNow.toISOString(),
      message: '各日の予約は7日前の同じ曜日0時から開始されます（当日予約不可）'
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: '予約枠の取得に失敗しました' }, { status: 500 });
  }
} 