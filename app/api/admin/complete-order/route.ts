import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 注文情報を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('payment_intent_id, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    // 決済処理が必要な場合（pendingの場合）
    if (order.payment_status === 'pending') {
      try {
        // 決済を実行
        await stripe.paymentIntents.capture(order.payment_intent_id);
      } catch (err: unknown) {
        if (
          err instanceof Stripe.errors.StripeError &&
          err.code === 'payment_intent_unexpected_state'
        ) {
          console.log('決済は既にキャプチャ済みです');
        } else {
          console.error('決済エラー:', err);
          return NextResponse.json(
            { error: '決済処理に失敗しました' },
            { status: 500 }
          );
        }
      }
    }

    // 注文ステータスを更新
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'confirmed',
        shipped: true
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('注文ステータス更新エラー:', updateError);
      return NextResponse.json(
        { error: '注文ステータスの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('エラー:', err);
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 