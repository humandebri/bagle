import type { NextConfig } from 'next';

/** @type {NextConfig} */
const nextConfig: NextConfig = {
  images: {
    // 画像形式の最適化 - AVIFを除外してWebPのみ使用（変換コスト削減）
    formats: ['image/webp'],
    // キャッシュ時間を1年に設定（頻繁なデプロイによるキャッシュ再生成を防ぐ）
    minimumCacheTTL: 31536000,
    // デバイスサイズを最適化（不要なサイズを削減）
    deviceSizes: [640, 750, 1080, 1200, 1920],
    // アイコンサイズも最適化
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dcoglbvltwtqvjyaxzzr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
