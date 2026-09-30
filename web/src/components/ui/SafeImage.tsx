'use client';

import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fill?: boolean;
}

export default function SafeImage({
  src,
  alt,
  fallbackSrc = '/images/products/placeholder.webp',
  className = '',
  fill,
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  const finalClassName = fill 
    ? `w-full h-full object-cover ${className}`
    : className;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={imgSrc}
      alt={alt || ''}
      className={finalClassName}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}

