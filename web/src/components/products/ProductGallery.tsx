'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { isRemoteImage } from '@/lib/utils/imageUtils';
import { useSearchParams } from 'next/navigation';

export default function ProductGallery({ images }: { images: { imageUrl: string, colorCode?: string, colorHex?: string, isPrimary?: boolean }[] }) {
  const searchParams = useSearchParams();
  const urlColor = searchParams.get('color');

  const [mainImage, setMainImage] = useState(images && images.length > 0 ? images[0].imageUrl : '/images/products/placeholder.webp');
  const [fadeKey, setFadeKey] = useState(mainImage);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (urlColor && images) {
      const match = images.find(img => 
        img.colorCode === urlColor || 
        (img.colorHex && img.colorHex.replace('#', '').toLowerCase() === urlColor.toLowerCase())
      );
      if (match) {
        setMainImage(match.imageUrl);
        setFadeKey(match.imageUrl);
      }
    }
  }, [urlColor, images]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  const validImages = images && images.length > 0 ? images.map(img => img.imageUrl).filter(img => img && !img.includes('placeholder')) : [];
  const displayImages = validImages.length > 0 ? validImages : ['/images/products/placeholder.webp'];

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Thumbnails */}
      <div className="flex md:flex-col gap-2 order-2 md:order-1 overflow-x-auto md:overflow-visible">
        {displayImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => { setMainImage(img); setFadeKey(img); }}
            className={`relative w-16 h-20 shrink-0 border-2 transition-all ${
              mainImage === img ? 'border-[#18181B]' : 'border-transparent hover:border-slate-300'
            }`}
          >
            <Image
              src={img}
              unoptimized={isRemoteImage(img)}
              alt={`Thumbnail ${idx + 1}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div 
        className="relative aspect-[3/4] w-full order-1 md:order-2 bg-slate-50 overflow-hidden cursor-crosshair group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <Image
          key={fadeKey}
          src={mainImage || displayImages[0]}
          unoptimized={isRemoteImage(mainImage || displayImages[0])}
          alt="Product Main Image"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          className={`object-cover transition-all duration-200 animate-in fade-in ${isZoomed ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}
          priority
        />
        
        {/* Zoom Overlay */}
        {isZoomed && (
          <div 
            className="absolute inset-0 z-10 bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url(${mainImage || displayImages[0]})`,
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
              backgroundSize: '200%' // Adjust zoom level here
            }}
          />
        )}
      </div>
    </div>
  );
}

