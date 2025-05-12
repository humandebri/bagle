import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent.payment_method) {
      return NextResponse.json({ error: 'payment_method not found' }, { status: 404 });
    }
    return NextResponse.json({ paymentMethodId: paymentIntent.payment_method });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('get-payment-methodエラー:', error);
    return NextResponse.json({ error }, { status: 500 });
  }
} 