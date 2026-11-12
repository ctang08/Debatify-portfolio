// app/main/pricing/page.tsx (Server Component)
import Pricing from '@/app/components/pricing';
import PricingCarouselClient from '@/app/components/PricingCarouselClient';
import { createClient } from '@/utils/supabase/server';
import { getProducts, getSubscription, getUser } from '@/utils/supabase/queries';

export default async function PricingPage() {
  const supabase = await createClient();
  const [user, products, subscription] = await Promise.all([
    getUser(supabase),
    getProducts(supabase),
    getSubscription(supabase),
  ]);

  const images = ['/blockfile.png', '/contentions.png', '/extendify.png', '/AI.png'];

  return (
    <div className="defaulttext">
      <div className="min-h-[100svh] grid px-5 gap-y-10 lg:[grid-template-columns:minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] content-center items-start">
        <div className="hidden lg:flex lg:col-start-2 justify-center self-start min-w-0">
          <div className="w-full max-w-[100rem]">
            <PricingCarouselClient images={images} height={500} autoplaySpeed={3000} />
          </div>
        </div>

        <div className="lg:col-start-4 flex justify-center self-start min-w-0">
          <div className="w-full max-w-xl [&>*]:mt-0">
            <Pricing user={user} products={products ?? []} subscription={subscription} />
          </div>
        </div>
      </div>
    </div>
  );
}
