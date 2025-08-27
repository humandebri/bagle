import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    // Cronジョブからのリクエストか確認（Vercel Cron用）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // 現在時刻を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 期限切れの予約を取得
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, dispatch_date, dispatch_time, items')
      .eq('payment_status', 'pending')
      .lt('reservation_expires_at', jstNow.toISOString())
      .not('reservation_expires_at', 'is', null);

    if (fetchError) {
      console.error('Failed to fetch expired orders:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch expired orders' }, { status: 500 });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ 
        message: 'No expired reservations found',
        processed: 0 
      });
    }

    // 各期限切れ注文を処理
    const results = [];
    for (const order of expiredOrders) {
      try {
        // 1. 注文をキャンセル状態に更新
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'cancelled',
            shipped: false,
            updated_at: jstNow.toISOString()
          })
          .eq('id', order.id);

        if (updateOrderError) {
          console.error(`Failed to cancel order ${order.id}:`, updateOrderError);
          results.push({ orderId: order.id, success: false, error: updateOrderError.message });
          continue;
        }

        // 2. タイムスロットの予約数を減らす
        const timeWithSeconds = order.dispatch_time.length === 5 
          ? `${order.dispatch_time}:00` 
          : order.dispatch_time;

        const { data: slot, error: slotFetchError } = await supabase
          .from('time_slots')
          .select('current_bookings, max_capacity')
          .eq('date', order.dispatch_date)
          .eq('time', timeWithSeconds)
          .single();

        if (!slotFetchError && slot) {
          const newBookings = Math.max(0, slot.current_bookings - 1);
          const isAvailable = newBookings < slot.max_capacity;

          const { error: updateSlotError } = await supabase
            .from('time_slots')
            .update({ 
              current_bookings: newBookings,
              is_available: isAvailable
            })
            .eq('date', order.dispatch_date)
            .eq('time', timeWithSeconds);

          if (updateSlotError) {
            console.error(`Failed to update slot for order ${order.id}:`, updateSlotError);
          }
        }

        results.push({ 
          orderId: order.id, 
          success: true,
          date: order.dispatch_date,
          time: order.dispatch_time
        });

      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.push({ orderId: order.id, success: false, error: String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`Expired reservations cleanup: ${successCount}/${expiredOrders.length} processed`);
    
    return NextResponse.json({ 
      message: `Processed ${successCount} expired reservations`,
      processed: successCount,
      total: expiredOrders.length,
      results
    });

  } catch (error) {
    console.error('Cleanup expired reservations error:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup expired reservations' 
    }, { status: 500 });
  }
}

// POSTメソッドも追加（手動実行用）
export async function POST(request: Request) {
  // 管理者のみ実行可能にする場合はここに認証チェックを追加
  return GET(request);
}