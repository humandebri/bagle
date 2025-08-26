import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function POST(request: Request) {
  try {
    // 管理者権限チェック
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 401 }
      );
    }

    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '削除する注文IDを指定してください' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 複数注文を一括削除
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);

    if (error) {
      console.error('Error deleting orders:', error);
      return NextResponse.json(
        { error: '注文の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      deletedCount: orderIds.length 
    });
  } catch (error) {
    console.error('Error in POST /api/admin/orders/bulk-delete:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}