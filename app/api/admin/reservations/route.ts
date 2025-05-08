import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabase';
import { Session } from 'next-auth';

// 予約一覧の取得
export async function GET(request: Request) {
  const session = await getServerSession(authOptions) as Session;

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('orders')
      .select(`
        id,
        user_id,
        created_at,
        items,
        dispatch_date,
        dispatch_time,
        total_price,
        payment_status,
        profiles!user_id (
          first_name,
          last_name,
          phone
        )
      `)
      .order('dispatch_date', { ascending: true });

    if (startDate && endDate) {
      query = query
        .gte('dispatch_date', startDate)
        .lte('dispatch_date', endDate);
    }

    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!orders) {
      return NextResponse.json([]);
    }

    // 顧客情報を整形
    const formattedOrders = orders.map(order => {
      const profile = (order.profiles as unknown) as { 
        first_name: string | null; 
        last_name: string | null; 
        phone: string | null 
      } | null;
      
      return {
        ...order,
        status: order.payment_status,
        customer_name: profile ? `${profile.last_name || ''} ${profile.first_name || ''}`.trim() : null,
        phone: profile?.phone || null,
        profiles: undefined, // 整形後は不要なので削除
      };
    });

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('予約取得エラー:', error);
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 });
  }
}

// 予約の更新
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions) as Session;

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, dispatchDate, dispatchTime, items } = body;

    const updateData: any = {
      payment_status: status,
      dispatch_date: dispatchDate,
      dispatch_time: dispatchTime,
      items: items,
    };

    // updated_atカラムが存在する場合のみ設定
    // Supabaseのテーブル定義で自動更新される場合は、ここでの設定は不要かもしれません。
    // 例: ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT now();
    // もし手動で更新時刻を管理したい場合は、テーブルに`updated_at TIMESTAMPTZ`カラムを作成してください。
    // 今回はエラーログに基づき、一旦コメントアウトします。

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (orderError) {
      console.error('予約更新エラー(Supabase):', orderError);
      throw orderError;
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('予約更新エラー:', error);
    return NextResponse.json({ error: '予約の更新に失敗しました' }, { status: 500 });
  }
}

// 予約の削除
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions) as Session;

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: '予約を削除しました' });
  } catch (error) {
    console.error('予約削除エラー:', error);
    return NextResponse.json({ error: '予約の削除に失敗しました' }, { status: 500 });
  }
} 