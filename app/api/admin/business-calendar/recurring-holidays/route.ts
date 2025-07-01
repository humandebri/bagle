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

// GET /api/admin/business-calendar/recurring-holidays
export async function GET() {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: holidays, error } = await supabase
      .from('recurring_holidays')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recurring holidays:', error);
      return NextResponse.json(
        { error: 'データの取得に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ holidays: holidays || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/admin/business-calendar/recurring-holidays
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, pattern, is_active } = body;

    if (!name || !type || !pattern) {
      return NextResponse.json(
        { error: 'name、type、patternは必須です', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('recurring_holidays')
      .insert({
        name,
        type,
        pattern,
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recurring holiday:', error);
      return NextResponse.json(
        { error: 'データの保存に失敗しました', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}