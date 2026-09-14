'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ProductGallery({ images }: { images: { imageUrl: string }[] }) {
  const [mainImage, setMainImage] = useState(images && images.length > 0 ? images[0].imageUrl : '/images/products/placeholder.webp');
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
            onClick={() => setMainImage(img)}
            className={`relative w-16 h-20 shrink-0 border-2 transition-all ${
              mainImage === img ? 'border-[#18181B]' : 'border-transparent hover:border-gray-300'
            }`}
          >
            <Image
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div 
        className="relative aspect-[3/4] w-full order-1 md:order-2 bg-gray-50 overflow-hidden cursor-crosshair group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <Image
          src={mainImage || displayImages[0]}
          alt="Product Main Image"
          fill
          className={`object-cover transition-transform duration-200 ${isZoomed ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}
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
