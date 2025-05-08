import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(request: Request) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: '支払いIDが必要です' },
        { status: 400 }
      );
    }

    // 支払い意図の状態を確認
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // すでにキャンセル済みの場合は成功として扱う
    if (paymentIntent.status === 'canceled') {
      return NextResponse.json({ 
        success: true, 
        message: '支払いはすでにキャンセルされています',
        paymentIntent 
      });
    }

    // 支払いをキャンセル
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer'
    });

    return NextResponse.json({ 
      success: true, 
      paymentIntent: canceledPaymentIntent 
    });
  } catch (error) {
    console.error('支払いキャンセルエラー:', error);
    
    // Stripeのエラーオブジェクトから詳細情報を取得
    const stripeError = error as Stripe.errors.StripeError;
    const errorMessage = stripeError.message || '支払いのキャンセルに失敗しました';
    const errorCode = stripeError.code || 'unknown_error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        type: stripeError.type
      },
      { status: 500 }
    );
  }
} 