// app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-04-30.basil',
  });

export async function POST(req: Request) {
  const { items } = await req.json();

  const line_items = items.map((item: any) => ({
    price_data: {
      currency: 'jpy',
      product_data: {
        name: item.name,
      },
      unit_amount: item.price, // 円単位→stripeは「最小単位（=銭）」
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: `${req.headers.get("origin")}/online-shop/success`,
    cancel_url: `${req.headers.get("origin")}/online-shop/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
