'use client';
import { useState, useEffect, FormEvent, useRef } from "react";
import { createClient } from '@/utils/supabase/client'
import { FiCopy } from "react-icons/fi"; 
import { useRouter } from 'next/navigation';

const supabase = createClient()

export default function Search() {
  const [loading, setLoading] = useState('');          // banner for initial search only
  const [isBusy, setIsBusy] = useState(false);         // any request in-flight
  const [isAppending, setIsAppending] = useState(false); // specifically "load more"

  const [show, setShow] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const latestRequest = useRef(0);
  const hasActiveRequest = useRef(false);

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFinishedRequest, setHasFinishedRequest] = useState(false);
  const router = useRouter();

  // ---- Paging ----
  const COUNT = 20;
  const MAX_OFFSET = 9;              // Brave supports offsets 0..9.
  const [hasMore, setHasMore] = useState(true);

  const [offset, _setOffset] = useState(0);
  const offsetRef = useRef(0);
  const setOffset = (n: number) => { offsetRef.current = n; _setOffset(n); };

  // Search Bar
  const [input, setInput] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // reset for a brand-new search
    setOffset(0);
    setHasMore(true);
    setResults([]);
    setError(null);
    setHasFinishedRequest(false);
    searchData(input, { append: false, forcedOffset: 0, count: COUNT });
  }

  useEffect(() => {
    const handleKeyDown = (e: { key: string }) => { if (e.key === "Escape") setShow(null); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fonts = [
    { name: "Calibri", className: "calibri" },
    { name: "Arial", className: "arial" },
    { name: "Times New Roman", className: "times" },
    { name: "Comic Sans", className: "comic" }
  ];
  const [font, setFont] = useState("calibri");
  const [highlightColor, setHighlightColor] = useState("#fdff00");

  async function searchData(
    str: string,
    opts: { append?: boolean; forcedOffset?: number; count?: number } = {}
  ) {
    const requestId = Date.now();
    latestRequest.current = requestId;

    const isAppend = Boolean(opts.append);
    const usedCount = typeof opts.count === 'number' ? opts.count : COUNT;
    const usedOffset = typeof opts.forcedOffset === 'number' ? opts.forcedOffset : offsetRef.current;

    if (hasActiveRequest.current && controller.current) {
      controller.current.abort();
      if (!isAppend) { setLoading('cancelling previous search...'); await new Promise(r => setTimeout(r, 400)); }
    }

    const abortController = new AbortController();
    controller.current = abortController;

    setIsBusy(true);
    setIsAppending(isAppend);
    setLoading(isAppend ? '' : 'fetching results (could take up to a minute)...');
    hasActiveRequest.current = true;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'web', entry: str, count: usedCount, offset: usedOffset }),
        signal: abortController.signal,
      });

      if (res.status === 401) {
        alert("You've been signed out due to excessive use.");
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      const contentType = res.headers.get('content-type');
      if (res.status === 429) {
        const resetHeader = res.headers.get('X-RateLimit-Minute-Reset') || res.headers.get('X-RateLimit-Reset');
        let waitTime = 60;
        if (resetHeader) {
          const diffMs = parseInt(resetHeader, 10) - Date.now();
          if (!isNaN(diffMs)) waitTime = Math.max(Math.floor(diffMs / 1000), 1);
        }
        setError(`Rate limit exceeded. Please wait ${waitTime} seconds and try again.`);
        return;
      }

      if (!res.ok || !contentType?.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Unexpected response:\n${text}`);
      }

      const data = await res.json();
      if (latestRequest.current === requestId) {
        const incoming: string[] = Array.isArray(data.results) ? data.results : [];

        if (isAppend) {
          // de-dupe against existing
          const seen = new Set(results);
          const deduped = incoming.filter((html) => !seen.has(html));
          if (deduped.length === 0) {
            // End of results (or complete overlap) — hide button; DON'T advance offset.
            setHasMore(false);
          } else {
            setResults((prev) => [...prev, ...deduped]);
            const next = usedOffset + 1;
            setHasMore(next <= MAX_OFFSET);   // hide only after page 9
            setOffset(next);
          }
        } else {
          // initial page
          setResults(incoming);
          if (incoming.length === 0) {
            setHasMore(false);
            // leave offset at 0
          } else {
            const next = usedOffset + 1; // 0 -> 1
            setHasMore(next <= MAX_OFFSET);
            setOffset(next);
          }
        }

        setError(null);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error("Fetch error:", error);
        setError("Something went wrong. Please try again.");
      }
    } finally {
      if (latestRequest.current === requestId) {
        setHasFinishedRequest(true);
        setLoading('');
        hasActiveRequest.current = false;
        setIsBusy(false);
        setIsAppending(false);
      }
    }
  }

  // Allow new searches anytime, but prevent double-tap load-more.
  const handleLoadMore = () => {
    if (isBusy || !hasMore) return; // single press while loading OR when no more pages
    // pre-lock to block rapid double-clicks in the same tick
    setIsBusy(true);
    setIsAppending(true);
    searchData(input, { append: true, forcedOffset: offsetRef.current, count: COUNT });
  };

  return (
    <div>
      <div className="relative z-0 flex flex-col mt-5 ml-5 mr-5 defaulttext pointer-events-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="hidden sm:block text-[10px] text-gray-500 defaulttext px-3 py-2 rounded-lg bg-white shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white max-w-sm leading-snug fixed bottom-4 right-12 z-50 ">
            ⚠️ AI output may be inaccurate, it's intended to be recut.
          </div>
          <div className='flex-col'>
            <h1 className="text-3xl font-semibold mb-1">Search with AI</h1>
            <div className="w-full h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mb-4" />
          </div>

          <div className="hidden sm:flex flex items-center gap-4 mt-6">
            <select className="simpleform" onChange={(e) => setHighlightColor(e.target.value)}>
              <option value="#fdff00">Yellow</option>
              <option value="#00ffff">Cyan</option>
              <option value="#00ff00">Green</option>
            </select>
            <select className="simpleform" onChange={(e) => setFont(e.target.value)} value={font}>
              {[
                { name: "Calibri", className: "calibri" },
                { name: "Arial", className: "arial" },
                { name: "Times New Roman", className: "times" },
                { name: "Comic Sans", className: "comic" }
              ].map((font) => (
                <option key={font.name} value={font.className}>{font.name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-col flex sm:w-3/10 mb-3">
          <div className='flex'>
            <input
              type="text"
              placeholder="Search..."
              value={input}
              className="w-full simpleform hover:scale-102"  
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="ml-2 simpleform"
              // ⬇️ allow starting a new search even if one is running
              disabled={false}
              title="Run search"
            >
              {/* Always show 'Submit' (no 'Searching…') */}
              Submit
            </button>
          </div>
          {loading && <p className="mt-2 text-sm text-gray-500">{loading}</p>}
        </form>

        <div className="mt-6 overflow-y-auto px-4 cursor-default relative z-10 pb-6" style={{ height: "calc(100vh - 200px)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasFinishedRequest && (results.length === 0 || error) ? (
              error ? <div className="text-red-500 text-sm">{error}</div> : <div className="text-gray-500 text-sm">No Results or Timeout :(</div>
            ) : (
              results.map((html, index) => (
                <div
                  key={`${index}-${html.slice(0,40)}`}
                  onClick={() => setShow(html)}
                  className="group relative z-5 bg-white dark:bg-gray-100 text-black shadow-lg rounded-2xl overflow-hidden p-6 pt-12 hover:shadow-xl transition-all duration-200"
                  style={{ height: '340px' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const type = "text/html";
                      const blob = new Blob([html], { type });
                      const data = [new ClipboardItem({ [type]: blob })];
                      navigator.clipboard.write(data);
                    }}
                    className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                    title="Copy to clipboard"
                  >
                    <FiCopy size={18} />
                  </button>
                  <div className={`reset-injected-html ${font} text-sm overflow-hidden`} style={{ maxHeight: '260px' }}>
                    <div
                      dangerouslySetInnerHTML={{ __html: html.replace(
                        /<mark>(.*?)<\/mark>/g,
                        `<span style="background-color: ${highlightColor}; padding: 2px;">$1</span>`
                      ) }}
                    />
                    <span className="absolute bottom-3 left-3 text-xs text-gray-500 group-hover:opacity-100 opacity-0 transition-opacity">Click to expand</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Only show if there are results, no error, AND we still have pages left by offset */}
          {results.length > 0 && !error && hasMore && (
            <div className="flex justify-center mt-6 mb-10">
              <button
                onClick={handleLoadMore}
                disabled={isBusy} // single-tap only while loading
                className="simpleform w-full hover:scale-100"
                title="Load more!"
              >
                {isBusy && isAppending ? 'Loading…' : 'Load more!'}
              </button>
            </div>
          )}

          {show && (
            <div
              className="fixed inset-0 backdrop-blur-md bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 transition-all duration-300"
              onClick={() => setShow(null)}
            >
              <div
                className="bg-white dark:bg-gray-100 text-black rounded-2xl p-8 max-w-4xl w-full h-[80vh] overflow-y-auto relative scale-100 opacity-100 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    const type = "text/html";
                    const blob = new Blob([show], { type });
                    const data = [new ClipboardItem({ [type]: blob })];
                    navigator.clipboard.write(data);
                  }}
                  className="absolute top-3 right-3 z-10 text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                  title="Copy to clipboard"
                >
                  <FiCopy size={20} />
                </button>
                <button
                  onClick={() => setShow(null)}
                  className="absolute top-3 right-12 z-10 text-gray-600 hover:text-black dark:hover:text-white cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>

                <div className={`reset-injected-html ${font} text-base mt-8`}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: show.replace(
                        /<mark>(.*?)<\/mark>/g,
                        `<span style="background-color: ${highlightColor}; padding: 2px;">$1</span>`
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        `}</style>
      </div>
    </div>
  );
}
