import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { date, time } = await request.json();

    if (!date || !time) {
      return NextResponse.json({ 
        valid: false, 
        message: '日付と時間を選択してください' 
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // 現在の日時を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 選択された日時を日本時間として解析
    const selectedDateTime = new Date(`${date}T${time}+09:00`);
    
    // 過去の日時かチェック
    if (selectedDateTime <= jstNow) {
      return NextResponse.json({ 
        valid: false, 
        message: '過去の日時は選択できません。新しい日時を選択してください。' 
      });
    }
    
    // 予約開始制限のチェック（7日前の同じ曜日0時から予約可能）
    const slotDate = new Date(date + 'T00:00:00+09:00');
    const bookingStartDate = new Date(slotDate);
    bookingStartDate.setDate(bookingStartDate.getDate() - 7);
    bookingStartDate.setHours(0, 0, 0, 0);
    
    if (jstNow < bookingStartDate) {
      return NextResponse.json({ 
        valid: false, 
        message: 'この日付の予約はまだ開始されていません。予約は1週間前の同じ曜日0時から開始されます。' 
      });
    }
    
    // time_slotsテーブルから該当スロットを取得
    const { data: slot, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('date', date)
      .eq('time', time)
      .single();
      
    if (error || !slot) {
      return NextResponse.json({ 
        valid: false, 
        message: 'この時間枠は利用できません。別の時間枠を選択してください。' 
      });
    }
    
    // スロットが利用可能かチェック
    if (!slot.is_available) {
      return NextResponse.json({ 
        valid: false, 
        message: 'この時間枠は満員です。別の時間枠を選択してください。' 
      });
    }
    
    // 予約可能枠が残っているかチェック
    const remainingCapacity = slot.max_capacity - slot.current_bookings;
    if (remainingCapacity <= 0) {
      return NextResponse.json({ 
        valid: false, 
        message: 'この時間枠は満員です。別の時間枠を選択してください。' 
      });
    }
    
    return NextResponse.json({ 
      valid: true, 
      message: '時間枠は利用可能です',
      remainingCapacity 
    });
    
  } catch (error) {
    console.error('Time slot validation error:', error);
    return NextResponse.json({ 
      valid: false, 
      message: 'エラーが発生しました。もう一度お試しください。' 
    }, { status: 500 });
  }
}