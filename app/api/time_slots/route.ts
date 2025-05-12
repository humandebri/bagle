import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ timeSlots: data });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: '時間枠の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_slots')
      .insert([
        {
          date: body.date,
          time: body.time,
          max_capacity: body.max_capacity ?? 1,
          current_bookings: body.current_bookings ?? 0,
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
    const { data, error } = await supabase
      .from('time_slots')
      .update({
        max_capacity: body.max_capacity,
        is_available: body.is_available,
      })
      .eq('date', body.date)
      .eq('time', body.time)
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
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('date', body.date)
      .eq('time', body.time);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json({ error: '時間枠の削除に失敗しました' }, { status: 500 });
  }
} 