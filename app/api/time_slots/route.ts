import { createServerSupabaseClient } from '@/lib/supabase-server';
import { normalizeSlotCategory } from '@/lib/categories';
import { isTimeRangeWithinCategory } from '@/lib/slot-rules';
import { NextResponse } from 'next/server';

function normalizeTimeValue(timeValue?: string | null): string | null {
  if (!timeValue) return null;
  return timeValue.length === 5 ? `${timeValue}:00` : timeValue;
}

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
    
    const allowedCategory = normalizeSlotCategory(body.allowed_category);
    const timeValue = normalizeTimeValue(body.time);
    const endTimeValue = normalizeTimeValue(body.end_time);

    if (!timeValue || !endTimeValue) {
      return NextResponse.json(
        { error: '開始時間と終了時間の両方を指定してください' },
        { status: 400 },
      );
    }

    if (!isTimeRangeWithinCategory(allowedCategory, timeValue.slice(0, 5), endTimeValue.slice(0, 5))) {
      return NextResponse.json(
        { error: 'このカテゴリでは指定した時間帯を利用できません' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('time_slots')
      .insert([
        {
          date: body.date,
          time: timeValue,
          end_time: endTimeValue,
          max_capacity: body.max_capacity !== undefined ? body.max_capacity : 1,
          current_bookings: 0, // 新規作成時は常に0（実際の予約数は動的に計算される）
          is_available: body.is_available ?? true,
          allowed_category: allowedCategory,
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
    
    const timeValue = normalizeTimeValue(body.time);
    const endTimeValue = normalizeTimeValue(body.end_time);

    if (!timeValue) {
      return NextResponse.json(
        { error: '開始時間を指定してください' },
        { status: 400 },
      );
    }
    
    const updates: Record<string, unknown> = {};

    if (body.max_capacity !== undefined) {
      updates.max_capacity = body.max_capacity;
    }
    if (body.is_available !== undefined) {
      updates.is_available = body.is_available;
    }

    if (body.allowed_category !== undefined) {
      const category = normalizeSlotCategory(body.allowed_category);
      updates.allowed_category = category;
      if (endTimeValue) {
        if (!isTimeRangeWithinCategory(category, timeValue.slice(0, 5), endTimeValue.slice(0, 5))) {
          return NextResponse.json(
            { error: 'このカテゴリでは指定した時間帯を利用できません' },
            { status: 400 },
          );
        }
        updates.end_time = endTimeValue;
      }
    } else if (endTimeValue) {
      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('allowed_category')
        .eq('date', body.date)
        .eq('time', timeValue)
        .single();
      if (slotError) {
        return NextResponse.json(
          { error: '時間枠の確認に失敗しました' },
          { status: 500 },
        );
      }
      const category = normalizeSlotCategory(slot?.allowed_category);
      if (!isTimeRangeWithinCategory(category, timeValue.slice(0, 5), endTimeValue.slice(0, 5))) {
        return NextResponse.json(
          { error: 'このカテゴリでは指定した時間帯を利用できません' },
          { status: 400 },
        );
      }
      updates.end_time = endTimeValue;
    }

    const { data, error } = await supabase
      .from('time_slots')
      .update(updates)
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
    
    const timeValue = normalizeTimeValue(body.time);
    if (!timeValue) {
      return NextResponse.json(
        { error: '開始時間を指定してください' },
        { status: 400 },
      );
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
