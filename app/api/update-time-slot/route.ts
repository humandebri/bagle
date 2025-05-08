import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

type RequestBody = {
  date: string; // yyyy-mm-dd
  time: string; // '11:00' など
};

type TimeSlot = {
  date: string;
  time: string;
  max_capacity: number;
  current_bookings: number;
  is_available: boolean;
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { date, time }: RequestBody = await req.json();
    const supabase = await createServerSupabaseClient();

    // ★ 型はここで指定 ────────────────────────┐
    const { data: timeSlot, error: fetchError } = await supabase
      .rpc('lock_time_slot', { p_date: date, p_time: time })
      .single<TimeSlot>();                           // ←──┘

    if (fetchError) throw fetchError;

    if (!timeSlot || !timeSlot.is_available) {
      return NextResponse.json(
        { error: 'この時間枠は既に予約が埋まっています' },
        { status: 400 },
      );
    }

    const newBookings = timeSlot.current_bookings + 1;
    const isAvailable = newBookings < timeSlot.max_capacity;

    const { error: updateError } = await supabase
      .from('time_slots')
      .update({
        current_bookings: newBookings,
        is_available: isAvailable,
      })
      .eq('date', date)
      .eq('time', time);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error updating time slot:', err);
    return NextResponse.json(
      { error: '予約枠の更新に失敗しました' },
      { status: 500 },
    );
  }
}
