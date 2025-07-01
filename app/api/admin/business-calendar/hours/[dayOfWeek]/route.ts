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

// 時間を HH:MM 形式に変換
function formatTime(time: string | null): string | null {
  if (!time) return null;
  // すでに HH:MM 形式の場合はそのまま返す
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  const date = new Date(`1970-01-01T${time}`);
  return date.toTimeString().slice(0, 5);
}

// PUT /api/admin/business-calendar/hours/[dayOfWeek]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dayOfWeek: string }> }
) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dayOfWeek: dayOfWeekParam } = await params;
    const dayOfWeek = parseInt(dayOfWeekParam);
    
    // 曜日の妥当性チェック（0-6）
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: '無効な曜日です', code: 'INVALID_DAY_OF_WEEK' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { open_time, close_time, is_closed } = body;

    const supabase = await createServerSupabaseClient();
    
    // upsert（存在すれば更新、なければ作成）
    const { data, error } = await supabase
      .from('business_hours')
      .upsert({
        day_of_week: dayOfWeek,
        open_time: is_closed ? null : (open_time || null),
        close_time: is_closed ? null : (close_time || null),
        is_closed: is_closed ?? false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'day_of_week'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting business hours:', error);
      return NextResponse.json(
        { error: 'データの保存に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 時間をフォーマット
    const formattedData = {
      ...data,
      open_time: formatTime(data.open_time),
      close_time: formatTime(data.close_time)
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