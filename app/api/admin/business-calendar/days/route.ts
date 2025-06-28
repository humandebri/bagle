import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// 管理者権限チェック
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return false;
  }
  
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('email', session.user.email)
    .single();
    
  return profile?.is_admin === true;
}

// GET /api/admin/business-calendar/days
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: '開始日と終了日は必須です', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: days, error } = await supabase
      .from('business_days')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date');

    if (error) {
      console.error('Error fetching business days:', error);
      return NextResponse.json(
        { error: 'データの取得に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 日付をフォーマット
    const formattedDays = days?.map(day => ({
      ...day,
      date: new Date(day.date).toISOString().split('T')[0]
    })) || [];

    return NextResponse.json({ days: formattedDays });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/admin/business-calendar/days
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, is_open, is_special, notes } = body;

    if (!date) {
      return NextResponse.json(
        { error: '日付は必須です', code: 'MISSING_DATE' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // upsert（存在すれば更新、なければ作成）
    const { data, error } = await supabase
      .from('business_days')
      .upsert({
        date,
        is_open: is_open ?? true,
        is_special: is_special ?? false,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting business day:', error);
      return NextResponse.json(
        { error: 'データの保存に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 日付をフォーマット
    const formattedData = {
      ...data,
      date: new Date(data.date).toISOString().split('T')[0]
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/business-calendar/days/[date]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = params.date;
    if (!date) {
      return NextResponse.json(
        { error: '日付は必須です', code: 'MISSING_DATE' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('business_days')
      .delete()
      .eq('date', date);

    if (error) {
      console.error('Error deleting business day:', error);
      return NextResponse.json(
        { error: 'データの削除に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}