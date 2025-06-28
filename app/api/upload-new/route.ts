import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as Session;
    console.log('🧠 session from getServerSession:', session);

    // ✅ サーバー側で管理者チェック（RLSなしでOK）
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Service Role を使用（RLSバイパス）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // ❗これを使う（絶対にフロントに出さない）
    );

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    // ✅ バケット確認（なければ作成）
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'product-images')) {
      const { error: createBucketError } = await supabase.storage.createBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
        fileSizeLimit: 5 * 1024 * 1024,
      });
      if (createBucketError) throw createBucketError;
    }

    // ✅ ファイル名生成とアップロード（新規商品用）
    const timestamp = Date.now();
    const extension = (file as File).name?.split('.')?.pop() || 'jpg';
    const fileName = `new_${timestamp}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // ✅ 公開URL取得
    const { data: publicUrlData } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 新規商品の場合はDB更新をスキップして、URLのみ返す
    return NextResponse.json({ url: publicUrl });

  } catch (error: unknown) {
    console.error('Error in upload-new route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}