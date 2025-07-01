import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 注文が存在するか確認
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    if (order.payment_status === 'cancelled') {
      return NextResponse.json({ error: 'キャンセル済みの注文は完了できません' }, { status: 400 });
    }

    // 注文ステータスを更新
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shipped: true
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('注文ステータス更新エラー:', updateError);
      return NextResponse.json(
        { error: '注文ステータスの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('エラー:', err);
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 