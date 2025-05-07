import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { amount, customerId, paymentMethodId } = await req.json();

    if (!amount || !customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // PaymentIntentを作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: 'manual',
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    return NextResponse.json({ paymentIntent });
  } catch (err) {
    console.error('PaymentIntent作成エラー:', err);
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    const errorDetails = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'PaymentIntentの作成に失敗しました',
        details: errorMessage,
        stack: errorDetails
      },
      { status: 500 }
    );
  }
}
