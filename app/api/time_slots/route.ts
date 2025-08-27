import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. time_slotsテーブルのデータを取得（current_bookingsはDBの値をそのまま使用）
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (timeSlotsError) throw timeSlotsError;

    // 2. 仮予約数を取得（slot_reservationsテーブル）
    const { data: tempReservations } = await supabase
      .from('slot_reservations')
      .select('date, time')
      .gte('expires_at', new Date().toISOString());

    // テーブルが存在しない場合もあるのでnullチェック
    const reservations = tempReservations || [];

    // 3. 各time_slotに仮予約数を追加
    const enrichedTimeSlots = timeSlots?.map(slot => {
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

    return NextResponse.json({ timeSlots: enrichedTimeSlots });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: '時間枠の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    
    // 時間フォーマットを正規化（"11:00" → "11:00:00"）
    let timeValue = body.time;
    if (timeValue && timeValue.length === 5) {
      timeValue = `${timeValue}:00`;
    }
    
    const { data, error } = await supabase
      .from('time_slots')
      .insert([
        {
          date: body.date,
          time: timeValue,
          max_capacity: body.max_capacity !== undefined ? body.max_capacity : 1,
          current_bookings: 0, // 新規作成時は常に0（実際の予約数は動的に計算される）
          is_available: body.is_available ?? true,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ timeSlot: data });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return NextResponse.json({ error: '時間枠の作成に失敗しました' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    
    // 時間フォーマットを正規化
    let timeValue = body.time;
    if (timeValue && timeValue.length === 5) {
      timeValue = `${timeValue}:00`;
    }
    
    const { data, error } = await supabase
      .from('time_slots')
      .update({
        max_capacity: body.max_capacity,
        is_available: body.is_available,
      })
      .eq('date', body.date)
      .eq('time', timeValue)
      .select();
    if (error) throw error;
    return NextResponse.json({ timeSlot: data });
  } catch (error) {
    console.error('Error updating time slot:', error);
    return NextResponse.json({ error: '時間枠の編集に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    
    // 時間フォーマットを正規化
    let timeValue = body.time;
    if (timeValue && timeValue.length === 5) {
      timeValue = `${timeValue}:00`;
    }
    
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('date', body.date)
      .eq('time', timeValue);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json({ error: '時間枠の削除に失敗しました' }, { status: 500 });
  }
} 