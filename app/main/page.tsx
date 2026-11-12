'use client';
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from 'next/navigation';
import { FiCopy } from "react-icons/fi";
import { createClient } from '@/utils/supabase/client';

interface SearchResult {
  tag: string;
  markdown: string;
  citation: string;
  // NEW
  link?: string; // present only on some cards
}

type CardSet = 'pre' | 'recent';

// --- Helper: use Supabase client-side to get the current user (no Stripe on client) ---
async function getUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data; // { user, ... }
}

function removeFontSizeStyles(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const spans = doc.querySelectorAll('span[style*="font-size"]');
  spans.forEach((span) => {
    const style = span.getAttribute('style');
    if (!style) return;
    const cleaned = style
      .split(';')
      .filter((s) => !s.toLowerCase().includes('font-size'))
      .join(';')
      .trim();
    if (cleaned) span.setAttribute('style', cleaned);
    else span.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

export default function Search() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [show, setShow] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [font, setFont] = useState<string>("calibri");
  const [highlightColor, setHighlightColor] = useState<string>("#fdff00");
  const [tagFontSize, setTagFontSize] = useState<string>("11pt");
  const [modifiedHTML, setModifiedHTML] = useState<string>("");
  const [cardSet, setCardSet] = useState<CardSet>("pre"); // 'pre' (free) or 'recent' (Pro)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  // NEW: subscription banner state
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fonts = [
    { name: "Calibri", className: "calibri" },
    { name: "Arial", className: "arial" },
    { name: "Times New Roman", className: "times" },
    { name: "Comic Sans", className: "comic" }
  ] as const;

  // Server check: keep Stripe strictly server-side
  async function isProServer(): Promise<boolean> {
    try {
      const res = await fetch('/api/subscription', { method: 'GET' });
      if (!res.ok) return false;
      const data = await res.json() as { active: boolean };
      return !!data.active;
    } catch {
      return false;
    }
  }

  // Hydrate pro status once (optional; banner still waits for a search)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subscription', { method: 'GET' });
        const data = await res.json() as { active: boolean };
        setIsPro(!!data.active);
      } catch {
        setIsPro(false);
      }
    })();
  }, []);

  // Pro gate using getUser() first (signed in), then server check (Stripe on server only)
  async function ensureProOrRedirect(): Promise<boolean> {
    const userData = await getUser();
    const user = userData?.user;
    if (!user) {
      router.push('/main/pricing');
      return false;
    }
    const active = await isProServer();
    if (!active) {
      router.push('/main/pricing');
      return false;
    }
    return true;
  }

  const handleCardSetChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CardSet;
    if (selected === "recent") {
      const ok = await ensureProOrRedirect();
      if (!ok) {
        setCardSet("pre");
        return;
      }
    }
    setCardSet(selected);
  };

  const updateHighlightedHTML = (): void => {
    if (!show) return;

    const highlighted = show.replace(
      /<mark>(.*?)<\/mark>/g,
      `<span style="background-color: ${highlightColor}; padding: 2px; text-decoration: underline;">$1</span>`
    );

    const chunks = highlighted.split(/<br\s*\/?>/i);
    let paragraphCount = 0;

    const shouldUnderline = (el: Element): boolean => {
      const style = el.getAttribute("style") || "";
      const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)pt/i);
      const underlineMatch = /text-decoration\s*:\s*underline/i.test(style);
      const size = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 999;
      return size >= 10 || underlineMatch;
    };

    const underlineEligibleNodes = (root: HTMLElement): string => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
      const nodesToWrap: Node[] = [];
      let node: Node | null;

      // eslint-disable-next-line no-cond-assign
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          const parent = (node as Text).parentElement;
          if (parent && shouldUnderline(parent)) nodesToWrap.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (shouldUnderline(el) && el.childElementCount === 0 && el.textContent?.trim()) {
            nodesToWrap.push(el);
          }
        }
      }

      for (const target of nodesToWrap) {
        if (target.nodeType === Node.TEXT_NODE) {
          const span = document.createElement("span");
          span.style.textDecoration = "underline";
          span.textContent = target.textContent;
          target.parentNode?.replaceChild(span, target);
        } else if (target.nodeType === Node.ELEMENT_NODE) {
          const el = target as HTMLElement;
          if (!/text-decoration\s*:\s*underline/i.test(el.getAttribute("style") || "")) {
            el.style.textDecoration = "underline";
          }
        }
      }

      return root.innerHTML;
    };

    const processedChunks = chunks.map((chunk, index) => {
      const trimmed = chunk.trim();
      if (trimmed.length > 0) paragraphCount++;

      const doc = new DOMParser().parseFromString(chunk, "text/html");
      const root = doc.body as HTMLElement;

      if (index === 0) {
        const firstEl = root.firstElementChild as HTMLElement | null;
        if (firstEl) {
          firstEl.setAttribute(
            "style",
            `${firstEl.getAttribute("style") || ""}; font-size: ${tagFontSize}; font-weight: bold;`
          );
        } else if (root.firstChild && root.firstChild.nodeType === Node.TEXT_NODE) {
          const span = document.createElement("span");
          span.style.fontSize = tagFontSize;
          span.style.fontWeight = "bold";
          span.textContent = root.firstChild.textContent;
          root.replaceChild(span, root.firstChild);
        }
        return root.innerHTML;
      }

      if (paragraphCount <= 2) return root.innerHTML; // skip underlining for first two paragraphs
      return underlineEligibleNodes(root);
    });

    setModifiedHTML(processedChunks.join("<br />"));
  };

  useEffect(() => {
    updateHighlightedHTML();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightColor, show, tagFontSize]);

  async function searchData(str: string): Promise<void> {
    if (str.trim() === '') return;

    // Guard search when Pro set is selected
    if (cardSet === 'recent') {
      const ok = await ensureProOrRedirect();
      if (!ok) return;
    }

    setLoading(true);
    try {
      const base =
        cardSet === "recent"
          ? `${process.env.NEXT_PUBLIC_EVIDENCE_API_URL || ''}/recentsearch?q=`
          : `${process.env.NEXT_PUBLIC_EVIDENCE_API_URL || ''}/search?q=`;

      const response = await fetch(base + encodeURIComponent(str));
      const data: SearchResult[] = await response.json();
      setResults(data);

      // NEW: mark that a search has occurred and ensure we know pro status
      setHasSearched(true);
      if (isPro === null) {
        try {
          const res = await fetch('/api/subscription', { method: 'GET' });
          const payload = await res.json() as { active: boolean };
          setIsPro(!!payload.active);
        } catch {
          setIsPro(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    searchData(input);
  }

  function stripHighlights(html: string): string {
    return html
      .replace(/<mark[^>]*>/g, '')
      .replace(/<span[^>]*background-color[^>]*>/gi, '')
      .replace(/<\/mark>/g, '')
      .replace(/<\/span>/gi, '');
  }

  return (
    <div>
      <div className="relative flex flex-col mt-5 ml-5 mr-5 defaulttext">
        <div className="flex justify-between items-center">
          <div className='flex-col'>
<h1 className="text-3xl font-semibold mb-1">
  Find Evidence
  {isPro === true && (
    <span
      aria-label="Pro"
      title="Pro"
      className="ml-1 align-super font-bold text-pink-400"
    >
      +
    </span>
  )}
</h1>
            <div className="w-full h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mb-4" />
          </div>
          <div className="hidden sm:flex flex items-center gap-4 mt-6">
            <select
              className="simpleform"
              onChange={(e) => setHighlightColor(e.target.value)}
              value={highlightColor}
            >
              <option value="#fdff00">Yellow</option>
              <option value="#00ffff">Cyan</option>
              <option value="#00ff00">Green</option>
            </select>
            <select
              className="simpleform"
              onChange={(e) => setFont(e.target.value)}
              value={font}
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.className}>{f.name}</option>
              ))}
            </select>
            <select
              className="simpleform"
              onChange={(e) => setTagFontSize(e.target.value)}
              value={tagFontSize}
            >
              {[...Array(8).keys()].map(i => {
                const size = i + 11;
                return (
                  <option key={size} value={`${size}pt`}>
                    Tag Size: {size} pt
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full lg:w-3/10 mb-3">
          <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2">
            {/* Search input: full row on mobile, flex-1 on larger screens */}
            <input
              type="text"
              placeholder="Search..."
              value={input}
              className="simpleform hover:scale-102 w-full sm:flex-1 sm:w-auto min-w-0"
              onChange={(e) => setInput(e.target.value)}
            />

            {/* On mobile: force this group to a new line and stack full-width */}
            <div className="flex basis-full sm:basis-auto w-full sm:w-auto flex-col sm:flex-row gap-2">
              <select
                className="simpleform hover:scale-102 w-full sm:w-30 truncate shrink-0"
                value={cardSet}
                onChange={handleCardSetChange}
                aria-label="Select card set"
                title={cardSet === 'recent' ? 'Pro Feature' : undefined}
              >
                <option value="pre">Legacy</option>
                <option value="recent">2025-26 (Pro Feature)</option>
              </select>

              <button type="submit" className="simpleform w-full sm:w-auto shrink-0">
                Submit
              </button>
            </div>
          </div>
        </form>

        {/* NEW: Bold green pop-up shown only after at least one search and only if not subscribed */}
        {hasSearched && isPro === false && (
          <div className="ml-4 mb-4 dark:text-green-400 text-green-700 text-xs w-full sm:w-28/100 font-semibold">
            Not finding what you want?{" "}
            <button
              type="button"
              onClick={() => router.push('/main/pricing')}
              className="underline decoration-2 underline-offset-2 hover:opacity-80 dark:text-blue-400 text-blue-700 cursor-pointer"
            >
              Try Pro
            </button>{" "}
            with blockfile, AI search, lastest cards, contention search, and extension generator.
          </div>
                     

        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-0">
          {/* Left Panel (Results List) */}
          <div
            className="w-full lg:w-3/10 mt-2 lg:mt-0 rounded-md overflow-y-auto max-h-[20vh] lg:max-h-[80vh]"
            style={{ overflowX: "hidden", wordBreak: "break-word" }}
          >
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul>
                {results.map((result: SearchResult, index: number) => {
  const cleanTag = stripHighlights(result.tag);
  const highlightlessCitation = stripHighlights(result.citation);
  const cleanCitation = removeFontSizeStyles(highlightlessCitation);

  return (
    <div key={index} className="flex items-center">
      <button
        className="block w-full mb-2 text-left rounded-sm font-semibold ml-0 px-4 hover:bg-gray-200 dark:hover:bg-gray-600 py-1.5 lg:py-2 cursor-pointer"
        onClick={() => {
          setShow(
            `<b>${cleanTag}</b><br />${cleanCitation}<br />${result.markdown}<br />`
          );
          setSelectedResult(result); // NEW
        }}
      >
        <div className="text-[12pt] font-bold">
          <b dangerouslySetInnerHTML={{ __html: cleanTag }} />
        </div>
        <div className="text-[9pt] font-normal">
          <span>
            {cleanCitation.replace(/<[^>]+>/g, '').slice(0, 500)}
            {cleanCitation.replace(/<[^>]+>/g, '').length > 500 && '...'}
          </span>
        </div>
      </button>
    </div>
  );
})}

              </ul>
            )}
          </div>

          <div className="lg:hidden w-full h-1 bg-gray-800 dark:bg-white rounded-full opacity-80" />

          {/* Right Panel (Markdown Viewer) */}
          <div
            className={`h-1/2 max-h-[40vh] lg:max-h-[80vh] lg:h-auto relative lg:absolute top-0 lg:top-20 right-0 lg:right-8 w-full lg:w-62/100 px-4 py-4 rounded-md overflow-y-auto ${
              show != null ? "dark:bg-gray-100" : "dark:bg-gray-900"
            } text-black reset-injected-html ${font}`}
          >
            {show && (
  <div className="relative flex items-start reset-injected-html h-full">
    <div className="absolute top-0 right-0 flex gap-2">
      {/* Download button – only for cards with link */}
      {selectedResult?.link && (
        <a
          href={selectedResult.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2 py-1 border rounded hover:bg-gray-200"
        >
          Download
        </a>
      )}

      {/* Existing copy button */}
      <button
        onClick={() => {
          const type = "text/html";
          const blob = new Blob([modifiedHTML], { type });
          const data = [new ClipboardItem({ [type]: blob })];
          navigator.clipboard.write(data);
        }}
        className="text-lg text-gray-600 hover:text-gray-300 p-1 cursor-pointer"
        title="Copy to clipboard"
      >
        <FiCopy size={20} />
      </button>
    </div>

    <div
      className={`bg-${highlightColor} text-[12pt] w-full px-4 py-3`}
      dangerouslySetInnerHTML={{ __html: modifiedHTML }}
    />
  </div>
)}

          </div>
        </div>

      </div>
    </div>
  );
}
