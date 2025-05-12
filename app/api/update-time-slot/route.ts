// import { createServerSupabaseClient } from '@/lib/supabase-server';
// import { NextResponse } from 'next/server';
// import Stripe from 'stripe';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-04-30.basil',
// });

// export async function POST(request: Request) {
//   try {
//     const { orderId, newAmount } = await request.json();
//     const supabase = await createServerSupabaseClient();

//     // 注文情報を取得
//     const { data: order, error: orderError } = await supabase
//       .from('orders')
//       .select('payment_intent_id')
//       .eq('id', orderId)
//       .single();

//     if (orderError || !order) {
//       throw new Error('注文情報の取得に失敗しました');
//     }

//     if (!order.payment_intent_id) {
//       throw new Error('支払い意図IDが見つかりません');
//     }

//     // PaymentIntentの状態を取得
//     const pi = await stripe.paymentIntents.retrieve(order.payment_intent_id);

//     // すでに決済完了している場合はエラー
//     if (pi.status === 'succeeded' || pi.status === 'captured') {
//       return NextResponse.json(
//         { error: 'この注文はすでに決済が完了しているため、金額変更できません' },
//         { status: 400 }
//       );
//     }

//     // requires_captureの場合は新規作成
//     if (pi.status === 'requires_capture') {
//       // customer, payment_methodを流用
//       const newPI = await stripe.paymentIntents.create({
//         amount: newAmount,
//         currency: 'jpy',
//         customer: typeof pi.customer === 'string' ? pi.customer : undefined,
//         payment_method: typeof pi.payment_method === 'string' ? pi.payment_method : undefined,
//         capture_method: 'manual',
//         confirm: true,
//         automatic_payment_methods: {
//           enabled: true,
//           allow_redirects: 'never'
//         }
//       });

//       // ordersテーブルのpayment_intent_idを更新
//       await supabase
//         .from('orders')
//         .update({ payment_intent_id: newPI.id })
//         .eq('id', orderId);

//       // 旧PaymentIntentはキャンセル
//       await stripe.paymentIntents.cancel(order.payment_intent_id);

//       return NextResponse.json({ paymentIntent: newPI });
//     }

//     // それ以外の状態なら通常通り金額変更
//     const paymentIntent = await stripe.paymentIntents.update(
//       order.payment_intent_id,
//       {
//         amount: newAmount
//       }
//     );

//     return NextResponse.json({ paymentIntent });
//   } catch (error) {
//     console.error('Error updating payment intent:', error);
//     return NextResponse.json(
//       { error: '支払い意図の更新に失敗しました' },
//       { status: 500 }
//     );
//   }
// }
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

type RequestBody = {
  date: string; // yyyy-mm-dd
  time: string; // '11:00' など
};

type TimeSlot = {
  date: string;
  time: string;
  max_capacity: number;
  current_bookings: number;
  is_available: boolean;
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { date, time }: RequestBody = await req.json();
    const supabase = await createServerSupabaseClient();

    // ★ 型はここで指定 ────────────────────────┐
    const { data: timeSlot, error: fetchError } = await supabase
      .rpc('lock_time_slot', { p_date: date, p_time: time })
      .single<TimeSlot>();                           // ←──┘

    if (fetchError) throw fetchError;

    if (!timeSlot || !timeSlot.is_available) {
      return NextResponse.json(
        { error: 'この時間枠は既に予約が埋まっています' },
        { status: 400 },
      );
    }

    const newBookings = timeSlot.current_bookings + 1;
    const isAvailable = newBookings < timeSlot.max_capacity;

    const { error: updateError } = await supabase
      .from('time_slots')
      .update({
        current_bookings: newBookings,
        is_available: isAvailable,
      })
      .eq('date', date)
      .eq('time', time);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error updating time slot:', err);
    return NextResponse.json(
      { error: '予約枠の更新に失敗しました' },
      { status: 500 },
    );
  }
}