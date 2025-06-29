import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { isValidDate, isValidTime, isPositiveInteger } from '@/lib/validations';

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
    
    // 入力検証
    const { date, time, max_capacity = 1, current_bookings = 0, is_available = true } = body;
    
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: '有効な日付を指定してください（YYYY-MM-DD）' }, { status: 400 });
    }
    
    if (!time || !isValidTime(time)) {
      return NextResponse.json({ error: '有効な時間を指定してください（HH:MM）' }, { status: 400 });
    }
    
    if (!isPositiveInteger(max_capacity) || max_capacity > 100) {
      return NextResponse.json({ error: '最大容量は1〜100の整数である必要があります' }, { status: 400 });
    }
    
    if (!Number.isInteger(current_bookings) || current_bookings < 0 || current_bookings > max_capacity) {
      return NextResponse.json({ error: '現在の予約数が不正です' }, { status: 400 });
    }
    
    if (typeof is_available !== 'boolean') {
      return NextResponse.json({ error: '利用可能フラグはboolean型である必要があります' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('time_slots')
      .insert([
        {
          date,
          time,
          max_capacity,
          current_bookings,
          is_available,
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
    const { date, time, max_capacity, is_available } = body;
    
    // 入力検証
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: '有効な日付を指定してください（YYYY-MM-DD）' }, { status: 400 });
    }
    
    if (!time || !isValidTime(time)) {
      return NextResponse.json({ error: '有効な時間を指定してください（HH:MM）' }, { status: 400 });
    }
    
    if (max_capacity !== undefined && (!isPositiveInteger(max_capacity) || max_capacity > 100)) {
      return NextResponse.json({ error: '最大容量は1〜100の整数である必要があります' }, { status: 400 });
    }
    
    if (is_available !== undefined && typeof is_available !== 'boolean') {
      return NextResponse.json({ error: '利用可能フラグはboolean型である必要があります' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    const updateData: { max_capacity?: number; is_available?: boolean } = {};
    if (max_capacity !== undefined) updateData.max_capacity = max_capacity;
    if (is_available !== undefined) updateData.is_available = is_available;
    
    const { data, error } = await supabase
      .from('time_slots')
      .update(updateData)
      .eq('date', date)
      .eq('time', time)
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
    const { date, time } = body;
    
    // 入力検証
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: '有効な日付を指定してください（YYYY-MM-DD）' }, { status: 400 });
    }
    
    if (!time || !isValidTime(time)) {
      return NextResponse.json({ error: '有効な時間を指定してください（HH:MM）' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('date', date)
      .eq('time', time);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json({ error: '時間枠の削除に失敗しました' }, { status: 500 });
  }
} 