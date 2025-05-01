import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { items, paymentMethod } = await req.json();

    // 金額を再計算（円 → 銭）
    const amount = items.reduce(
      (sum: number, i: { price: number; quantity: number }) =>
        sum + i.price * i.quantity * 100,
      0
    ) + 10 * 100; // 袋代（¥10）を加算

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      payment_method: paymentMethod,
      confirmation_method: 'automatic',
      confirm: true,
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // これが超重要！
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      requiresAction: intent.status === 'requires_action',
    });
  } catch (err: any) {
    console.error('Stripeエラー:', err);
    return NextResponse.json(
      { error: err.message || '支払いエラーが発生しました' },
      { status: 500 }
    );
  }
}
