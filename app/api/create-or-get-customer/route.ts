// app/api/create-or-get-customer/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 });
    }

    const userId = session.user.id;

    /* -------------------------------------------------
       1) Supabase（Route‑Handler 用クライアント）
    ------------------------------------------------- */
    const supabase = await createServerSupabaseClient();

    /* -------------------------------------------------
       2) profiles から既存 customer_id 取得
    ------------------------------------------------- */
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_id, email, first_name, last_name, phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile?.customer_id) {
      // 既に Stripe Customer がある場合はそれを返す
      return NextResponse.json({ customerId: profile.customer_id });
    }

    /* -------------------------------------------------
       3) Stripe Customer を新規作成
    ------------------------------------------------- */
    const customer = await stripe.customers.create({
      email: profile?.email || session.user.email || undefined,
      name:
        `${profile?.last_name ?? ''} ${profile?.first_name ?? ''}`.trim() ||
        undefined,
      phone: profile?.phone || undefined,
      metadata: {
        user_id: userId,
      },
    });

    /* -------------------------------------------------
       4) Supabase profiles に保存
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ customer_id: customer.id })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ customerId: customer.id });
  } catch (err) {
    console.error('Stripe customer 作成エラー:', err);
    return NextResponse.json({ error: '内部エラーが発生しました' }, { status: 500 });
  }
}
