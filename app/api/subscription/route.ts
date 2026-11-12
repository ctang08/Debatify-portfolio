import { NextResponse } from 'next/server';
import { getSubscription } from '@/utils/supabase/queries';
// If you have a server supabase helper, use it (keeps auth context via cookies):
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const subscription = await getSubscription(supabase);
    // active == true when there is a non-null subscription
    return NextResponse.json({ active: !!subscription });
  } catch (e) {
    // Fail closed (treat as not Pro), but don't leak details
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
