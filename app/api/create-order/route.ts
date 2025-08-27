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
    const { items, dispatch_date, dispatch_time, user_id, total_price } = await req.json();
    
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
    if (dispatch_date && dispatch_time) {
      // 1. 仮予約を削除（あれば）
      if (sessionId) {
        const { error: cleanupError } = await supabaseAdmin
          .rpc('cleanup_temp_reservation_for_order', {
            p_session_id: sessionId,
            p_date: dispatch_date,
            p_time: dispatch_time
          });
        
        if (cleanupError) {
          console.warn('仮予約の削除に失敗:', cleanupError);
          // エラーでも続行（仮予約がない場合もある）
        }
      }
      
      // 2. current_bookingsを増やす（管理者設定と連動）
      const { error: incrementError } = await supabaseAdmin
        .rpc('increment_current_bookings', {
          p_date: dispatch_date,
          p_time: dispatch_time
        });
      
      if (incrementError) {
        console.error('current_bookingsの更新に失敗:', incrementError);
      }
    }

    const { data, error } = await supabaseAdmin.from('orders').insert({
      user_id,
      items,
      dispatch_date,
      dispatch_time,
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
