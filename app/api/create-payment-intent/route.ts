import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { items, customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const amount = items.reduce(
      (sum: number, i: { price: number; quantity: number }) =>
        sum + i.price * i.quantity * 100,
      0
    ) + 10 * 100;

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      off_session: true,
      confirm: true,
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Stripeエラー:', error.message);
    return NextResponse.json(
      { error: error.message || '支払いエラーが発生しました' },
      { status: 500 }
    );
  }
}
