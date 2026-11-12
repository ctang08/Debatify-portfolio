'use client';

import PricingCarousel from '@/app/components/PricingCarousel';

export default function PricingCarouselClient(props: {
  images: string[];
  height?: number;
  autoplaySpeed?: number;
}) {
  // Optional: you can delay render until mount if needed:
  // const [mounted, setMounted] = useState(false);
  // useEffect(() => setMounted(true), []);
  // if (!mounted) return null;

  return <PricingCarousel {...props} />;
}
