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
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

type RequestBody = {
  date: string; // yyyy-mm-dd
  time: string; // '11:00' など
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { date, time }: RequestBody = await req.json();
    const supabase = await createServerSupabaseClient();
    
    // セッションIDを取得（認証済みユーザーのIDまたはクッキーから）
    const session = await getServerSession(authOptions);
    let sessionId = session?.user?.email || '';
    
    // セッションIDがない場合はクッキーから取得または生成
    if (!sessionId) {
      const cookieStore = await cookies();
      const existingSessionId = cookieStore.get('temp_session_id')?.value;
      
      if (!existingSessionId) {
        sessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        // クッキーに保存（15分間有効）
        cookieStore.set('temp_session_id', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15 // 15分
        });
      } else {
        sessionId = existingSessionId;
      }
    }

    // 仮予約前に容量チェック
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .select('current_bookings, max_capacity')
      .eq('date', date)
      .eq('time', time)
      .single();

    if (slotError || !slot) {
      console.error('Failed to fetch time slot:', slotError);
      return NextResponse.json(
        { error: '時間枠の確認に失敗しました' },
        { status: 500 },
      );
    }

    // 満員チェック
    if (slot.current_bookings >= slot.max_capacity) {
      return NextResponse.json(
        { error: 'この時間枠は満員です' },
        { status: 400 },
      );
    }

    // 時間枠を仮予約（シンプルに1つの関数だけ）
    const { data: result, error } = await supabase
      .rpc('reserve_time_slot', {
        p_date: date,
        p_time: time,
        p_session_id: sessionId
      });

    if (error) {
      console.error('Failed to reserve time slot:', error);
      return NextResponse.json(
        { error: '予約枠の確保に失敗しました' },
        { status: 500 },
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || 'この時間枠は予約できません' },
        { status: 400 },
      );
    }

    return NextResponse.json({ 
      success: true,
      expires_at: result.expires_at,
      session_id: sessionId,
      message: result.message
    });
  } catch (err: unknown) {
    console.error('Error updating time slot:', err);
    return NextResponse.json(
      { error: '予約枠の更新に失敗しました' },
      { status: 500 },
    );
  }
}