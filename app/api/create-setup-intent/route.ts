import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-04-30.basil',
});

export async function POST() {
  // 本来はログインユーザーの customerId を渡す
  const setupIntent = await stripe.setupIntents.create({
    payment_method_types: ['card'],
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
