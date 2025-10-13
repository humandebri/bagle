import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const {
      items,
      dispatch_date,
      dispatch_time,
      dispatch_end_time: requestEndTime,
      user_id,
      total_price,
    } = await req.json();
    
    // セッションIDを取得
    const session = await getServerSession(authOptions);
    let sessionId = session?.user?.email || '';
    
    if (!sessionId) {
      const cookieStore = await cookies();
      sessionId = cookieStore.get('temp_session_id')?.value || '';
    }

    if (!user_id || !items?.length) {
      return NextResponse.json({ 
        error: '不正なリクエスト',
        details: {
          user_id: !user_id ? '必須' : 'OK',
          items: !items?.length ? '必須' : 'OK'
        }
      }, { status: 400 });
    }

    const calculatedTotalPrice = total_price || items.reduce((s: number, i: OrderItem) => s + i.price * i.quantity, 0);

    // dispatch_dateとdispatch_timeがある場合のみ処理
    let finalDispatchEndTime = requestEndTime ?? null;

    if (dispatch_date && dispatch_time) {
      const { data: slotForEndTime, error: slotEndTimeError } = await supabaseAdmin
        .from('time_slots')
        .select('end_time')
        .eq('date', dispatch_date)
        .eq('time', dispatch_time.length === 5 ? `${dispatch_time}:00` : dispatch_time)
        .maybeSingle();

      if (slotEndTimeError) {
        console.warn('Failed to fetch end_time for order slot:', slotEndTimeError);
      }

      if (slotForEndTime?.end_time) {
        if (typeof slotForEndTime.end_time === 'string') {
          finalDispatchEndTime = slotForEndTime.end_time.slice(0, 5);
        } else {
          const iso = new Date(slotForEndTime.end_time).toISOString();
          finalDispatchEndTime = iso.slice(11, 16);
        }
      }

      // 新しい方式: release_time_slot_reservation関数を使用
      if (sessionId) {
        const { error: releaseError } = await supabaseAdmin
          .rpc('release_time_slot_reservation', {
            p_date: dispatch_date,
            p_time: dispatch_time,
            p_session_id: sessionId
          });
        
        if (releaseError) {
          // 新しい関数が存在しない場合は旧方式にフォールバック
          console.log('New function not found, using fallback');
          
          const { error: cleanupError } = await supabaseAdmin
            .rpc('cleanup_temp_reservation_for_order', {
              p_session_id: sessionId,
              p_date: dispatch_date,
              p_time: dispatch_time
            });
          
          if (cleanupError) {
            console.warn('仮予約の削除に失敗:', cleanupError);
          }
        }
      }
      
      // 2. current_bookingsを増やす（注文確定時）
      const { error: incrementError } = await supabaseAdmin
        .rpc('increment_current_bookings', {
          p_date: dispatch_date,
          p_time: dispatch_time
        });
      
      if (incrementError) {
        console.error('current_bookingsの更新に失敗:', incrementError);
      }

      // 3. 満員になったらis_availableをfalseに更新
      const { data: updatedSlot, error: slotCheckError } = await supabaseAdmin
        .from('time_slots')
        .select('current_bookings, max_capacity')
        .eq('date', dispatch_date)
        .eq('time', dispatch_time)
        .single();

      if (!slotCheckError && updatedSlot) {
        // current_bookings >= max_capacity の場合、is_availableをfalseに
        if (updatedSlot.current_bookings >= updatedSlot.max_capacity) {
          const { error: updateError } = await supabaseAdmin
            .from('time_slots')
            .update({ is_available: false })
            .eq('date', dispatch_date)
            .eq('time', dispatch_time);

          if (updateError) {
            console.error('is_availableの更新に失敗:', updateError);
          } else {
            console.log(`時間枠 ${dispatch_date} ${dispatch_time} が満員になったため、is_availableをfalseに更新しました`);
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin.from('orders').insert({
      user_id,
      items,
      dispatch_date,
      dispatch_time,
      dispatch_end_time: finalDispatchEndTime,
      total_price: calculatedTotalPrice,
      shipped: false
    }).select();

    if (error) {
      console.error('注文保存エラー:', error);
      return NextResponse.json({ 
        error: '注文の保存に失敗しました',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      order: data[0]
    });
  } catch (err) {
    console.error('予期せぬエラー:', err);
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    return NextResponse.json({ 
      error: '予期せぬエラーが発生しました',
      details: errorMessage
    }, { status: 500 });
  }
}
