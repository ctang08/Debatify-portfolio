import CustomerPortalForm from '@/app/components/portalform';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getSubscription,
  getUser
} from '@/utils/supabase/queries';

export default async function Account() {
  const supabase = await createClient();

  const [user, subscription] = await Promise.all([
    getUser(supabase),
    getSubscription(supabase)
  ]);

  if (!user) {
    redirect('/signin');
  }

  const getEmailPrefix = (email: string) => email.split('@')[0];
  const truncateEmail = (email: string, maxLength: number) => {
    return email.length > maxLength - 3
      ? email.substring(0, maxLength - 3) + '...'
      : email;
  };

  const prefix = user.email
    ? truncateEmail(getEmailPrefix(user.email), 18)
    : 'Guest';

  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <div className="w-full max-w-xs sm:max-w-md mx-auto p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <div className="px-2 sm:px-4 py-6 sm:py-8">
          <div className="sm:align-center sm:flex sm:flex-col">
            <h1 className="defaulttext text-3xl sm:text-4xl font-extrabold sm:text-center break-words">
              {prefix}
            </h1>
          </div>
        </div>
        <div className="p-2 sm:p-4">
          <CustomerPortalForm subscription={subscription} />
        </div>
      </div>
    </div>
  );
}


// import { redirect } from 'next/navigation';
// import { createClient } from '@/utils/supabase/server';
// import { getUser } from '@/utils/supabase/queries';


// export default async function Account() {
//   const supabase = await createClient();

//   const user = await getUser(supabase);

//   if (!user) {
//     redirect('/signin');
//   }

//   const getEmailPrefix = (email: string) => email.split('@')[0];
//   const truncateEmail = (email: string, maxLength: number) => {
//     if (email.length > maxLength - 3) {
//       return email.substring(0, maxLength - 3) + '...';
//     }
//     return email;
//   };

//   const prefix = user.email
//     ? truncateEmail(getEmailPrefix(user.email), 18)
//     : 'Guest';

//   return (
//   <div className="flex justify-center items-center min-h-screen">
//     <div className="bg-white rounded-xl shadow-md px-8 py-6 max-w-md w-full text-center">
//       <h2 className="text-sm font-medium text-gray-500 mb-1">Signed in as</h2>
//       <p className="text-2xl font-semibold text-black tracking-wide">{prefix}</p>
//     </div>
//   </div>
//   );
// }
