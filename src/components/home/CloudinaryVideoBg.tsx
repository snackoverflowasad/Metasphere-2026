"use client";

import { useEffect, useState } from "react";

export interface CloudinaryVideoBgProps {
  videoUrls: string[];
  intervalMs?: number;
}

/**
 * Renders the hero background Cloudinary `<video>` slideshow with the exact
 * `#FFFBF5` bottom-to-top translucent gradient overlay from the legacy theme.
 */
export function CloudinaryVideoBg({
  videoUrls,
  intervalMs = 8000,
}: CloudinaryVideoBgProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (videoUrls.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videoUrls.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [videoUrls.length, intervalMs]);

  return (
    <>
      <div
        id="video-slideshow"
        className="absolute top-0 left-0 w-full h-full z-0"
        aria-hidden="true"
      >
        {videoUrls.map((url, idx) => (
          <video
            key={url}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              idx === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src={url} type="video/mp4" />
          </video>
        ))}
      </div>
      <div
        className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-[#FFFBF5] via-[#FFFBF5]/80 to-transparent z-10"
        aria-hidden="true"
      />
    </>
  );
}
