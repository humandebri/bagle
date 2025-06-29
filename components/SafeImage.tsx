'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

export default function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);
  
  // 画像URLの検証
  const isValidSrc = src && 
                     typeof src === 'string' && 
                     src.trim() !== '' && 
                     src.trim() !== 'null' && 
                     src.trim() !== 'undefined';
  
  if (!isValidSrc || error) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    );
  }
  
  return (
    <Image
      {...props}
      src={src.trim()}
      alt={alt || 'Image'}
      onError={() => setError(true)}
    />
  );
}