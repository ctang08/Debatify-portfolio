'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Load react-slick only on the client
const Slick = dynamic(() => import('react-slick'), { ssr: false });

type Props = {
  images: string[];
  height?: number;        // default 1000
  autoplaySpeed?: number; // default 3000
};

export default function PricingCarousel({
  images,
  height = 1000,
  autoplaySpeed = 3000,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // Mount gate to avoid SSR/hydration timing issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait one animation frame so Tailwind media queries / layout are applied
  useEffect(() => {
    if (!mounted) return;
    let raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: false,
    adaptiveHeight: false,
  } as const;

  // Simple placeholder to avoid a flash of nothing on hard loads
  if (!ready) {
    const first = images?.[0];
    return (
      <div className="rounded-xl shadow-md overflow-hidden" style={{ height }}>
        {first ? (
          <img
            src={first}
            alt="Preview 1"
            className="w-full"
            style={{ height, objectFit: 'cover' }}
            draggable={false}
          />
        ) : null}
      </div>
    );
  }

  // Force Slick to re-init after ready flip
  return (
    <div className="rounded-xl shadow-md overflow-hidden" style={{ height }}>
      <Slick key={ready ? 'slick-ready' : 'slick-init'} {...settings}>
        {images.map((src, idx) => (
          <div key={idx}>
            <img
              src={src}
              alt={`Preview ${idx + 1}`}
              className="w-full"
              style={{ height, objectFit: 'cover' }}
              draggable={false}
            />
          </div>
        ))}
      </Slick>
    </div>
  );
}
