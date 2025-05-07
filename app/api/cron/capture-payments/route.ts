import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// cronジョブの認証用シークレット
const CRON_SECRET = process.env.CRON_SECRET;

// 日付を日本語形式に変換する関数
function getJapaneseDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日(${weekday})`;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const today = getJapaneseDate(new Date());

    // デバッグ用：今日の日付を確認
    console.log('今日の日付:', today);

    // デバッグ用：すべての注文を取得
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, payment_intent_id, dispatch_date, payment_status, shipped');

    console.log('すべての注文:', allOrders);

    // 今日受け取りの注文を取得
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, payment_intent_id, dispatch_date, payment_status, shipped')
      .eq('dispatch_date', today)
      .eq('payment_status', 'pending')
      .eq('shipped', false);

    // デバッグ用：検索条件を確認
    console.log('検索条件:', {
      dispatch_date: today,
      payment_status: 'pending',
      shipped: false
    });
    console.log('検索結果:', {
      orders,
      error: fetchError
    });

    if (fetchError) {
      console.error('注文取得エラー:', fetchError);
      return NextResponse.json({ error: '注文の取得に失敗しました' }, { status: 500 });
    }

    if (!orders?.length) {
      return NextResponse.json({ message: '処理対象の注文はありません' });
    }

    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    // 各注文の決済を実行
    for (const order of orders) {
      try {
        // 決済を実行
        await stripe.paymentIntents.capture(order.payment_intent_id);

        // 注文ステータスを更新
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'captured',
            captured_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) {
          throw updateError;
        }

        results.success.push(order.id);
      } catch (err) {
        console.error(`注文 ${order.id} の決済エラー:`, err);
        results.failed.push(order.id);

        // エラーを記録
        await supabase.from('payment_errors').insert({
          order_id: order.id,
          error_message: err instanceof Error ? err.message : '不明なエラー',
          occurred_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      message: '決済処理が完了しました',
      results,
    });
  } catch (err) {
    console.error('cronジョブエラー:', err);
    return NextResponse.json(
      { error: '内部エラーが発生しました' },
      { status: 500 }
    );
  }
} 