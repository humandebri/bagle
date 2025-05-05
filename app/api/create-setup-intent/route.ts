import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    let customerId: string | null = null;

    // Content-TypeとContent-LengthをチェックしてJSONがあるか確認
    const contentType = req.headers.get('content-type') || '';
    const contentLength = req.headers.get('content-length');

    if (contentType.includes('application/json') && contentLength !== '0') {
      const body = await req.json();
      customerId = body.customerId;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('SetupIntentエラー:', error.message);
    return NextResponse.json(
      { error: error.message || 'SetupIntent作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
