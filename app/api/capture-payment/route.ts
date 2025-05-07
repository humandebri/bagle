import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Supabaseから注文情報を取得
    const supabase = await createServerSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('payment_intent_id, dispatch_date')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    // 受け取り日が今日かチェック
    const today = new Date().toISOString().split('T')[0];
    if (order.dispatch_date !== today) {
      return NextResponse.json(
        { error: '受け取り日が今日ではありません' },
        { status: 400 }
      );
    }

    // 決済を実行
    const paymentIntent = await stripe.paymentIntents.capture(order.payment_intent_id);

    // 注文ステータスを更新
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'captured',
        captured_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('注文ステータス更新エラー:', updateError);
    }

    return NextResponse.json({
      success: true,
      paymentIntent: paymentIntent.id,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('決済キャプチャエラー:', error.message);
    return NextResponse.json(
      { error: error.message || '決済処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 