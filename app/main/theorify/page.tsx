'use client';


import { useState } from 'react';
import { FiCopy, FiX } from 'react-icons/fi';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';


const supabase = createClient();


export default function Theorify() {
 const [input, setInput] = useState('');
 const [output, setOutput] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);


 const router = useRouter();


 const MAX_WORDS = 250;
 const getWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);
 const wordCount = getWords(input).length;


 const sanitize = (text: string) =>
   text.replace(/</g, '&lt;').replace(/>/g, '&gt;');


const truncateToMaxWords = (text: string) => {
  const words = getWords(text);
  if (words.length <= MAX_WORDS) return text;
  
  const truncated = words.slice(0, MAX_WORDS).join(' ');
  return truncated;
};

const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const raw = e.target.value;
  setInput(truncateToMaxWords(raw));
  setDone(false);
};

const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  e.preventDefault();
  const clipboardText = e.clipboardData.getData('text');

  // Keep line breaks and enforce word limit
  const combinedText = input + '\n' + clipboardText;
  const words = getWords(combinedText);
  const truncatedText = words.slice(0, MAX_WORDS).join(' ');

  // Reconstruct with original line breaks preserved
  const lines = clipboardText.split('\n');
  let result = input ? input + '\n' : '';
  let wordTotal = getWords(input).length;

  for (let line of lines) {
    const lineWords = getWords(line);
    if (wordTotal + lineWords.length > MAX_WORDS) {
      const allowed = MAX_WORDS - wordTotal;
      result += lineWords.slice(0, allowed).join(' ') + '\n';
      break;
    } else {
      result += line + '\n';
      wordTotal += lineWords.length;
    }
  }

  setInput(result.trimEnd());
};


 const handleSubmit = async () => {
   if (!input.trim()) return;
   setLoading(true);
   setOutput('');
   setError(null);
   setDone(false)


   try {
     const safeInput = sanitize(input);
     const res = await fetch('/api/theorify', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ input: safeInput }),
     });


     const contentType = res.headers.get('content-type');


     if (res.status === 401) {
       alert("You've been signed out due to excessive use.");
       await supabase.auth.signOut();
       router.push('/login');
       return;
     }


     if (res.status === 429) {
       const resetHeader =
         res.headers.get('X-RateLimit-Minute-Reset') ||
         res.headers.get('X-RateLimit-Reset');


       let waitTime = 60; // fallback in seconds
       if (resetHeader) {
         const resetUnix = parseInt(resetHeader, 10);
         const now = Date.now();
         const diff = resetUnix - now;
         if (!isNaN(diff)) {
           waitTime = Math.max(Math.floor(diff / 1000), 1);
         }
       }


       setError(`Rate limit exceeded. Please wait ${waitTime} seconds and try again.`);
       return;
     }


     if (!res.ok || !contentType?.includes('application/json')) {
       const text = await res.text();
       throw new Error(`Unexpected response:\n${text}`);
     }


     const { result } = await res.json();
     setOutput(result);
     setDone(true);
   } catch (err) {
     console.error(err);
     setError("Something went wrong. Please try again.");
   } finally {
     setLoading(false);
   }
 };


 return (
   <div className="px-5 pt-5 pb-5 text-[12pt] h-[calc(100vh-48px)] flex flex-col">
     <div className="flex-col">
       <h1 className="text-3xl font-semibold mb-1 tracking-tight">Theorify</h1>
       <div className="w-32 h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mb-4" />
     </div>


     <div className="hidden sm:block text-[10px] text-gray-500 defaulttext px-3 py-2 rounded-lg bg-white shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white max-w-sm leading-snug fixed bottom-4 right-12 z-50">
       ⚠️ AI output may be inaccurate.
     </div>


     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
       {/* Input Column */}
       <div className="flex flex-col overflow-hidden">
         <div className="flex justify-between items-center mb-1">
           <h2 className="text-lg font-semibold">Input</h2>
           <button
             onClick={() => setInput('')}
             className="text-gray-500 hover:text-black text-sm hover:scale-105 transition-transform dark:text-white dark:hover:text-gray-400 cursor-pointer"
             title="Clear Input"
           >
             <FiX size={18} />
           </button>
         </div>


         {/* Submit Button */}
         <button
           onClick={handleSubmit}
           disabled={loading || !input.trim()}
           className="hover:scale-100 cursor-pointer w-full border border-black font-semibold bg-white text-black dark:bg-white dark:text-black dark:border-black mb-1 gap-2 py-1.5 px-2 rounded-lg transition"
         >
           {loading ? 'Generating...' : 'Submit'}
         </button>


         {/* Error Message */}
         {error && (
           <div className="mb-2 text-red-600 text-sm">
             {error}
           </div>
         )}

         {done && (
           <div className="mb-2 text-green-600 text-sm">
             Don't like it? Press submit again for a new extension.
           </div>
         )}

         {/* Input Textarea */}
         <textarea
           className="bg-white rounded-lg border shadow-sm p-4 flex-1 text-black resize-none w-full h-full outline-none"
           placeholder="Enter violation to turn into theory shell..."
           value={input}
           onChange={handleChange}
           onPaste={handlePaste}
           disabled={loading}
         />


         {/* Word Counter */}
         <div className="mt-1 text-sm text-gray-500">
           {wordCount} / {MAX_WORDS} words
         </div>
       </div>


       {/* Output Column */}
       <div className="flex flex-col overflow-hidden">
         <div className="flex justify-between items-center mb-2">
           <h2 className="text-lg font-semibold">Output</h2>
           <button
             onClick={async () => {
               try {
                 await navigator.clipboard.writeText(output);
               } catch (err) {
                 console.error('Copy failed:', err);
               }
             }}
             className="text-gray-500 hover:text-black text-sm hover:scale-105 transition-transform dark:text-white dark:hover:text-gray-400 cursor-pointer"
             title="Copy Output"
           >
             <FiCopy size={18} />
           </button>
         </div>


         <textarea
           className="bg-white rounded-lg border shadow-sm p-4 flex-1 text-black resize-none w-full h-full outline-none"
           placeholder="Generated result will appear here..."
           value={output}
           readOnly
         />
       </div>
     </div>
   </div>
 );
}