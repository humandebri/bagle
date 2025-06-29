import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const { items, dispatch_date, dispatch_time, user_id, total_price } = await req.json();

    // 入力検証
    if (!user_id || !items?.length || !dispatch_date || !dispatch_time) {
      return NextResponse.json({ 
        error: '不正なリクエスト',
        details: {
          user_id: !user_id ? '必須' : 'OK',
          items: !items?.length ? '必須' : 'OK',
          dispatch_date: !dispatch_date ? '必須' : 'OK',
          dispatch_time: !dispatch_time ? '必須' : 'OK'
        }
      }, { status: 400 });
    }

    // 数量制限チェック
    const totalQuantity = items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0);
    if (totalQuantity > 8) {
      return NextResponse.json({ 
        error: '注文数量が制限を超えています',
        details: `合計${totalQuantity}個は、最大注文数8個を超えています`
      }, { status: 400 });
    }

    // 個別商品の数量チェック
    const invalidItems = items.filter((item: OrderItem) => item.quantity > 3);
    if (invalidItems.length > 0) {
      return NextResponse.json({ 
        error: '商品ごとの数量が制限を超えています',
        details: `同じ商品は最大3個までです`
      }, { status: 400 });
    }

    const calculatedTotalPrice = total_price || items.reduce((s: number, i: OrderItem) => s + i.price * i.quantity, 0) + 10;

    // トランザクション処理
    // まず、タイムスロットをロックして更新
    const { data: timeSlot, error: lockError } = await supabaseAdmin
      .rpc('lock_time_slot', { p_date: dispatch_date, p_time: dispatch_time })
      .single();

    if (lockError) {
      console.error('タイムスロットロックエラー:', lockError);
      return NextResponse.json({ 
        error: 'タイムスロットの確保に失敗しました',
        details: lockError.message
      }, { status: 500 });
    }

    if (!timeSlot || !timeSlot.is_available) {
      return NextResponse.json({ 
        error: 'この時間枠は既に予約が埋まっています'
      }, { status: 400 });
    }

    // タイムスロットを更新
    const newBookings = timeSlot.current_bookings + 1;
    const isAvailable = newBookings < timeSlot.max_capacity;

    const { error: updateError } = await supabaseAdmin
      .from('time_slots')
      .update({
        current_bookings: newBookings,
        is_available: isAvailable,
      })
      .eq('date', dispatch_date)
      .eq('time', dispatch_time);

    if (updateError) {
      console.error('タイムスロット更新エラー:', updateError);
      return NextResponse.json({ 
        error: 'タイムスロットの更新に失敗しました',
        details: updateError.message
      }, { status: 500 });
    }

    // 注文を作成
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id,
        items,
        dispatch_date,
        dispatch_time,
        total_price: calculatedTotalPrice,
        shipped: false,
      })
      .select()
      .single();

    if (orderError) {
      // 注文作成に失敗した場合、タイムスロットを元に戻す
      console.error('注文保存エラー:', orderError);
      
      // ロールバック処理
      await supabaseAdmin
        .from('time_slots')
        .update({
          current_bookings: timeSlot.current_bookings,
          is_available: timeSlot.is_available,
        })
        .eq('date', dispatch_date)
        .eq('time', dispatch_time);

      return NextResponse.json({ 
        error: '注文の保存に失敗しました',
        details: orderError.message,
        code: orderError.code
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      order: orderData
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