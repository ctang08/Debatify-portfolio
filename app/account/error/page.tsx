import Link from 'next/link';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";


export default function Page() {
  return (
    <div className='flex flex-col min-h-screen px-4 sm:px-12 pt-8'>
      <Link href='/' className='text text-yellow-500 flex items-center mb-8'>
        <ArrowLeftIcon className="w-5 sm:w-6" />
        <span className='ml-2 text-base sm:text-lg'>Back</span>
      </Link>

      <h1 className='defaulttext text-center text-2xl sm:text-3xl font-semibold mt-12 px-2'>
        Something went wrong. Maybe an expired authorization link?
      </h1>
    </div>
  );
}
