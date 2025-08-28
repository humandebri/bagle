import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zodスキーマでバリデーション
const profileUpdateSchema = z.object({
  first_name: z.string().max(50).optional().nullable(),
  last_name: z.string().max(50).optional().nullable(),
  phone: z.string()
    .transform((val) => val?.replace(/[-\s]/g, '')) // ハイフンとスペースを削除
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val),
      '電話番号は10〜11桁の数字で入力してください'
    )
    .optional()
    .nullable(),
});

// GET: プロフィール取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Prismaで必要なフィールドのみ取得（SELECT *を避ける）
    const profile = await prisma.profiles.findUnique({
      where: { user_id: session.user.id },
      select: {
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
        is_admin: true,
      },
    });

    if (!profile) {
      // プロフィールが存在しない場合は空のデータを返す
      return NextResponse.json({
        first_name: '',
        last_name: '',
        phone: '',
        email: session.user.email || '',
        is_admin: false,
      });
    }

    // 成功レスポンス
    return NextResponse.json(profile);

  } catch (error) {
    // エラーの詳細はログに記録し、クライアントには汎用メッセージを返す
    if (process.env.NODE_ENV === 'development') {
      console.error('Profile fetch error:', error);
    }
    
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST/PUT: プロフィール更新
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();

    // サーバーサイドでバリデーション
    const validationResult = profileUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'データが無効です',
          details: process.env.NODE_ENV === 'development' 
            ? validationResult.error.errors 
            : undefined
        },
        { status: 400 }
      );
    }

    const { first_name, last_name, phone } = validationResult.data;

    // Prismaでアップサート（存在しなければ作成、存在すれば更新）
    const updatedProfile = await prisma.profiles.upsert({
      where: { user_id: session.user.id },
      update: {
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        email: session.user.email || null,
      },
      create: {
        user_id: session.user.id,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        email: session.user.email || null,
        is_admin: false,
      },
      select: {
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
      },
    });

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });

  } catch (error) {
    // エラーの詳細はログに記録し、クライアントには汎用メッセージを返す
    if (process.env.NODE_ENV === 'development') {
      console.error('Profile update error:', error);
    }
    
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: POSTと同じ動作
export async function PUT(request: NextRequest) {
  return POST(request);
}