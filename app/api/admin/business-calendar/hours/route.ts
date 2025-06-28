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
  const date = new Date(`1970-01-01T${time}`);
  return date.toTimeString().slice(0, 5);
}

// GET /api/admin/business-calendar/hours
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: hours, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week');

    if (error) {
      console.error('Error fetching business hours:', error);
      return NextResponse.json(
        { error: 'データの取得に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 時間をフォーマット
    const formattedHours = hours?.map(hour => ({
      ...hour,
      open_time: formatTime(hour.open_time),
      close_time: formatTime(hour.close_time)
    })) || [];

    return NextResponse.json({ hours: formattedHours });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}