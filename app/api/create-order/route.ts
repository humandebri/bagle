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
    const { items, dispatch_date, dispatch_time, user_id, paymentIntentId } = await req.json();

    if (!user_id || !items?.length || !paymentIntentId) {
      return NextResponse.json({ 
        error: '不正なリクエスト',
        details: {
          user_id: !user_id ? '必須' : 'OK',
          items: !items?.length ? '必須' : 'OK',
          paymentIntentId: !paymentIntentId ? '必須' : 'OK'
        }
      }, { status: 400 });
    }

    const total_price =
      items.reduce((s: number, i: OrderItem) => s + i.price * i.quantity, 0) + 10;

    const { data, error } = await supabaseAdmin.from('orders').insert({
      user_id,
      items,
      dispatch_date,
      dispatch_time,
      total_price,
      payment_intent_id: paymentIntentId,
      payment_status: 'pending',
      shipped: false,
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
