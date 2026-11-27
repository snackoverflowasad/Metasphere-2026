"use client";

import { useEffect, useState } from "react";

export interface ImageFadeCarouselProps {
  id: string;
  images: string[];
  altPrefix: string;
  intervalMs?: number;
}

/**
 * Cross-fading photo carousel preserving the legacy `#tech-carousel` (3s) and
 * `#iem-carousel` (5s) full-bleed `h-80` slideshow appearance.
 */
export function ImageFadeCarousel({
  id,
  images,
  altPrefix,
  intervalMs = 3000,
}: ImageFadeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className="w-full relative overflow-hidden rounded-xl shadow-lg">
      <div id={id} className="relative w-full h-80 overflow-hidden bg-gray-100">
        {images.map((src, idx) => (
          <img
            key={`${src}-${idx}`}
            src={src}
            alt={`${altPrefix} slide ${idx + 1}`}
            loading={idx === 0 ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              idx === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
