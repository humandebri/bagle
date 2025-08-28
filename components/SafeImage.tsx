'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useCallback } from 'react';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  product?: {
    id: string;
    name: string;
    image?: string | null;
    image_webp?: string | null;
  };
  src?: string; // 直接URLを指定する場合
  fallbackSrc?: string; // カスタムフォールバック
  preferWebP?: boolean; // WebPを優先するか（デフォルト: true）
  onLoadSuccess?: (usedWebP: boolean) => void; // 読み込み成功時のコールバック
  onFallback?: () => void; // フォールバック発生時のコールバック
}

/**
 * SafeImage Component
 * 
 * WebP画像の読み込みに失敗した場合、自動的にJPEG画像にフォールバックします。
 * これにより、WebP移行中も404エラーを防ぎ、サービスの継続性を保証します。
 * 
 * 使用例:
 * ```tsx
 * // 商品データを使用
 * <SafeImage product={product} alt={product.name} width={200} height={200} />
 * 
 * // 直接URLを指定
 * <SafeImage src={imageUrl} fallbackSrc={jpegUrl} alt="画像" fill />
 * ```
 */
export default function SafeImage({
  product,
  src,
  fallbackSrc,
  preferWebP = true,
  onLoadSuccess,
  onFallback,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isWebPError, setIsWebPError] = useState(false);
  
  // 画像URLの決定ロジック
  const getImageUrl = useCallback(() => {
    // 直接URLが指定されている場合
    if (src) {
      if (hasError && fallbackSrc) {
        return fallbackSrc;
      }
      return src;
    }
    
    // 商品データから画像URLを取得
    if (product) {
      // WebPが利用可能でエラーが発生していない場合
      if (preferWebP && product.image_webp && !isWebPError) {
        return product.image_webp;
      }
      // フォールバック: オリジナル画像
      return product.image || '/placeholder.svg';
    }
    
    // デフォルト
    return '/placeholder.svg';
  }, [src, hasError, fallbackSrc, product, preferWebP, isWebPError]);
  
  // エラーハンドリング
  const handleError = useCallback(() => {
    console.warn(`[SafeImage] 画像読み込みエラー: ${getImageUrl()}`);
    
    // WebP画像でエラーが発生した場合
    if (product?.image_webp && getImageUrl() === product.image_webp) {
      setIsWebPError(true);
      onFallback?.();
      console.info('[SafeImage] WebPからJPEGにフォールバック');
      return;
    }
    
    // その他のエラー
    setHasError(true);
    onFallback?.();
  }, [product, getImageUrl, onFallback]);
  
  // 読み込み成功時の処理
  const handleLoad = useCallback(() => {
    const usedWebP = product?.image_webp === getImageUrl();
    onLoadSuccess?.(usedWebP);
    
    if (usedWebP) {
      console.debug('[SafeImage] WebP画像の読み込み成功');
    }
  }, [product, getImageUrl, onLoadSuccess]);
  
  // Supabase画像の最適化を無効化（すでにWebPの場合は特に）
  const isSupabaseImage = getImageUrl()?.includes('supabase.co');
  const shouldUnoptimize = isSupabaseImage || getImageUrl()?.endsWith('.webp');
  
  return (
    <Image
      {...props}
      src={getImageUrl()}
      alt={props.alt || ''}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized={shouldUnoptimize}
    />
  );
}

/**
 * SafeProductImage - 商品画像専用のラッパー
 * 
 * 商品データを直接渡すだけで使える簡易版
 */
export function SafeProductImage({
  product,
  className,
  ...props
}: {
  product: {
    id: string;
    name: string;
    image: string | null;
    image_webp?: string | null;
  };
  className?: string;
} & Omit<ImageProps, 'src' | 'alt'>) {
  return (
    <SafeImage
      product={product}
      alt={product.name}
      className={className}
      {...props}
    />
  );
}

/**
 * Hook: useImageOptimizationStatus
 * 
 * WebP画像の利用状況を追跡
 */
export function useImageOptimizationStatus() {
  const [stats, setStats] = useState({
    totalImages: 0,
    webpSuccess: 0,
    webpFailed: 0,
    jpegUsed: 0
  });
  
  const trackImageLoad = useCallback((usedWebP: boolean) => {
    setStats(prev => ({
      ...prev,
      totalImages: prev.totalImages + 1,
      webpSuccess: usedWebP ? prev.webpSuccess + 1 : prev.webpSuccess,
      jpegUsed: !usedWebP ? prev.jpegUsed + 1 : prev.jpegUsed
    }));
  }, []);
  
  const trackFallback = useCallback(() => {
    setStats(prev => ({
      ...prev,
      webpFailed: prev.webpFailed + 1
    }));
  }, []);
  
  return { stats, trackImageLoad, trackFallback };
}