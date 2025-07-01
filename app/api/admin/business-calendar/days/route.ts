import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server-api';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    // 管理者用のSupabaseクライアントを使用（RLSをバイパス）
    // upsert（存在すれば更新、なければ作成）
    const { data, error } = await supabaseAdmin
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
// PUT /api/admin/business-calendar/days (一括更新)
export async function PUT(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { year, month, weekdays, is_open, is_special, notes, set_others_as_closed } = body;

    if (!year || month === undefined || !Array.isArray(weekdays)) {
      return NextResponse.json(
        { error: '年、月、曜日の指定は必須です', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 指定された月の全日付を取得
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const selectedDates = [];
    const otherDates = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const dateString = new Date(date).toISOString().split('T')[0];
      
      if (weekdays.includes(dayOfWeek)) {
        selectedDates.push(dateString);
      } else {
        otherDates.push(dateString);
      }
    }

    if (selectedDates.length === 0 && !set_others_as_closed) {
      return NextResponse.json(
        { error: '指定された条件に該当する日付がありません', code: 'NO_DATES' },
        { status: 400 }
      );
    }

    // 管理者用のSupabaseクライアントを使用（RLSをバイパス）
    // 一括upsert用のデータを準備
    const businessDays: {
      date: string;
      is_open: boolean;
      is_special: boolean;
      notes: string | null;
      updated_at: string;
    }[] = [];

    // 選択された曜日の日付を設定
    if (selectedDates.length > 0) {
      selectedDates.forEach(date => {
        businessDays.push({
          date,
          is_open: is_open ?? true,
          is_special: is_special ?? false,
          notes: notes || null,
          updated_at: new Date().toISOString()
        });
      });
    }

    // 選択された曜日以外を休業日に設定
    if (set_others_as_closed && otherDates.length > 0) {
      otherDates.forEach(date => {
        businessDays.push({
          date,
          is_open: false,
          is_special: false,
          notes: null,
          updated_at: new Date().toISOString()
        });
      });
    }

    const { data, error } = await supabaseAdmin
      .from('business_days')
      .upsert(businessDays, {
        onConflict: 'date'
      })
      .select();

    if (error) {
      console.error('Error bulk upserting business days:', error);
      return NextResponse.json(
        { error: 'データの保存に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/business-calendar/days (一括削除)
export async function DELETE(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '開始日と終了日は必須です', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 管理者用のSupabaseクライアントを使用（RLSをバイパス）
    const { error } = await supabaseAdmin
      .from('business_days')
      .delete()
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error deleting business days:', error);
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