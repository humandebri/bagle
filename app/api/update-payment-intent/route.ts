import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(request: Request) {
  try {
    const { orderId, newAmount } = await request.json();
    const supabase = await createServerSupabaseClient();

    // 注文情報を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('payment_intent_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('注文情報の取得に失敗しました');
    }

    if (!order.payment_intent_id) {
      throw new Error('支払い意図IDが見つかりません');
    }

    // Stripeの支払い意図を更新
    const paymentIntent = await stripe.paymentIntents.update(
      order.payment_intent_id,
      {
        amount: newAmount * 100, // セント単位に変換
      }
    );

    return NextResponse.json({ paymentIntent });
  } catch (error) {
    console.error('Error updating payment intent:', error);
    return NextResponse.json(
      { error: '支払い意図の更新に失敗しました' },
      { status: 500 }
    );
  }
} 