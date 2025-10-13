import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await ensureAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date } = bodySchema.parse(body);

    const { data: candidates, error: selectError } = await supabase
      .from('orders')
      .select('id, shipped, payment_status, dispatch_date')
      .eq('dispatch_date', date);

    if (selectError) {
      console.error('Bulk mark shipped select error:', selectError);
      return NextResponse.json(
        { error: '予約の取得に失敗しました' },
        { status: 500 }
      );
    }

    const targetIds =
      (candidates ?? [])
        .filter(order => order.shipped !== true && order.payment_status !== 'cancelled')
        .map(order => order.id);

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ shipped: true })
      .in('id', targetIds)
      .select('id');

    if (error) {
      console.error('Bulk mark shipped error:', error);
      return NextResponse.json(
        { error: '予約の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: data?.length ?? 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '日付の形式が正しくありません (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    console.error('Unexpected error in mark-shipped:', error);
    return NextResponse.json(
      { error: '一括更新処理でエラーが発生しました' },
      { status: 500 }
    );
  }
}
