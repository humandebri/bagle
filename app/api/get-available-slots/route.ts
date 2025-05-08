import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 現在の日付から2週間分の予約枠を取得
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);

    const { data: timeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', twoWeeksLater.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: '予約枠の取得に失敗しました' }, { status: 500 });
  }
} 