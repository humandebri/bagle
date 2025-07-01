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

// PUT /api/admin/business-calendar/recurring-holidays/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, type, pattern, is_active } = body;

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('recurring_holidays')
      .update({
        name,
        type,
        pattern,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recurring holiday:', error);
      return NextResponse.json(
        { error: 'データの更新に失敗しました', code: 'DB_ERROR' },
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

// DELETE /api/admin/business-calendar/recurring-holidays/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('recurring_holidays')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recurring holiday:', error);
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