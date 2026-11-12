
'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { HighlightStyle } from '@/app/extensions/HighlightStyle';
import { FiCopy, FiX} from 'react-icons/fi';
import { FaBug} from 'react-icons/fa';
import DOMPurify from 'isomorphic-dompurify';
import Link from 'next/link';

function extractCitationText(paraEl: HTMLElement): string {
  // 1) Primary: any bolded content (your current behavior)
  const boldText = Array.from(paraEl.querySelectorAll('strong, b'))
    .map(el => el.textContent?.trim() || '')
    .filter(Boolean)
    .join(' ');
  if (boldText) return boldText;

  // 2) Fallback: author up to the first number within the first 7 words
  // Use innerText to respect visual breaks; trim whitespace
  let head = (paraEl.innerText || '').replace(/\s+/g, ' ').trim();

  // If the citation uses a trailing bracket block, prefer the part before ']'
  // e.g., "Pummer ’15 [Theron; …]" → use "Pummer ’15"
  const bracketIdx = head.indexOf(']');
  if (bracketIdx > -1) head = head.slice(0, bracketIdx);

  const words = head.split(/\s+/);
  const lookahead = Math.min(7, words.length);

  let numberWordIdx = -1;
  for (let i = 0; i < lookahead; i++) {
    if (/\d/.test(words[i])) { // catches 2015, ’15, 15, etc.
      numberWordIdx = i;
      break;
    }
  }

  if (numberWordIdx >= 0) {
    // Return everything from the start through the word containing the first number
    return words.slice(0, numberWordIdx + 1).join(' ').trim();
  }

  // 3) Last-resort fallback: take the first 2–3 words to avoid empty tag
  return words.slice(0, 3).join(' ').trim();
}

const allowedCSSProps = new Set([
  'font-size',
  'font-family',
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'font-variant',
  'text-decoration',
  'vertical-align',
  'white-space',
  'text-align'
]);

const isElementFullyBold = (el: Element): boolean => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim()) continue;

    let parent = node.parentElement;
    let bold = false;
    while (parent) {
      const tagBold = ['B', 'STRONG'].includes(parent.tagName);
      const styleBold = parent.style.fontWeight === 'bold' || parseInt(parent.style.fontWeight || '0') >= 600;
      if (tagBold || styleBold) {
        bold = true;
        break;
      }
      parent = parent.parentElement;
    }

    if (!bold) return false;
  }

  return true;
};

function isFullyBoldParagraph(p: HTMLParagraphElement): boolean {
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim()) continue;

    let el: HTMLElement | null = node.parentElement;
    let bold = false;
    while (el) {
      if (el.tagName === 'STRONG' || el.tagName === 'B') {
        bold = true;
        break;
      }
      el = el.parentElement;
    }

    if (!bold) return false;
  }
  return true;
}

function filterInlineStyles(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style') || '';
    const safeStyles = style
      .split(';')
      .map(s => s.trim())
      .filter(rule => {
        const [prop] = rule.split(':').map(s => s.trim().toLowerCase());
        return allowedCSSProps.has(prop);
      })
      .join('; ');

    if (safeStyles.length > 0) {
      el.setAttribute('style', safeStyles);
    } else {
      el.removeAttribute('style');
    }
  });

  return doc.body.innerHTML;
}

export default function RichTextEditor() {
  const [html, setHtml] = useState('');
  const [rhetorifiedHtml, setRhetorifiedHtml] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showBugs, setShowBugs] = useState(false);

  useEffect(() => setIsClient(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      HighlightStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p>Paste cut cards (tag, citation, body) here...</p>',
    editorProps: {
      attributes: { class: 'prose' },
      handlePaste(view) {
        if (view.state.doc.textContent.trim() === 'Paste cut cards here...') {
          view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const dirty = editor.getHTML();
      const safe = DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['p','strong','b','i','em','u','span','br','h1','h2','h3','h4','h5','h6','a'],
        ALLOWED_ATTR: ['style','data-text-align','href','target','rel'],
        KEEP_CONTENT: true,
      });
      setHtml(filterInlineStyles(safe));
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (html) {
      const parsed = rhetorify(html);
const clean = DOMPurify.sanitize(parsed, {
  ALLOWED_TAGS: ['p','strong','b','i','em','u','span','br','h1','h2','h3','h4','h5','h6','a'],
  ALLOWED_ATTR: ['style','href','target','rel'],
  KEEP_CONTENT: true,
});
      setRhetorifiedHtml(filterInlineStyles(clean));
    }
  }, [html]);

  function rhetorify(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('p').forEach((p) => {
  const html = p.innerHTML;
  if (/<(br|br\/)>/i.test(html)) {
    const parts = html.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        const np = doc.createElement('p');
        np.innerHTML = part;
        p.parentElement?.insertBefore(np, p);
      }
      p.remove();
    }
  }
});

    const allElements = Array.from(doc.body.children);
    const output: string[] = [];


    for (let k = 1; k < allElements.length; k++) {
  const curr = allElements[k];
  const prev = allElements[k - 1];

  if (
    curr.tagName === 'P' &&
    curr.textContent?.trim().startsWith('https') &&
    prev.tagName === 'P' &&
    prev.textContent?.trim()
  ) {
    // Merge the https link into the previous paragraph
    prev.innerHTML = prev.innerHTML.trim() + ' ' + curr.innerHTML.trim();
    curr.innerHTML = ''; // Clear current so it doesn’t get processed again
  }
}



let x = 1;
while (x < allElements.length - 1) {
  const prev = allElements[x - 1];
  const curr = allElements[x];
  const next = allElements[x + 1];

  const isTagValid = (el: Element) => ['P', 'H3', 'H4'].includes(el.tagName);
  if (!isTagValid(curr) || !isTagValid(prev) || next.tagName !== 'P') {
    x++;
    continue;
  }

  const currText = curr.textContent?.replace(/\s+/g, ' ').trim() || '';
  const wordCount = currText.split(' ').length;

  const isPrevBold = isElementFullyBold(prev);
  const isCurrBold = isElementFullyBold(curr);

  const nextContainsHttpLink =
    /(https?:\/\/)/i.test(next.textContent || '') ||
    next.querySelector('a[href^="http"]') !== null;

  if (isCurrBold && isPrevBold && wordCount <= 3 && nextContainsHttpLink) {
    const currHTML = `<b>${currText}</b>`;
    const normalizedNext = next.innerHTML.trim().replace(/\s+/g, ' ');

    if (!normalizedNext.startsWith(currHTML) && !normalizedNext.startsWith(currText)) {
      next.innerHTML = `${currHTML} ` + next.innerHTML.trim();
    }

    curr.remove();
    allElements.splice(x, 1); // update array snapshot
    continue; // re-check this index
  }

  x++;
}

function isCitation(para: HTMLParagraphElement | null | undefined): boolean {
  const str = ((para && (para as HTMLElement).innerText) || '').toLowerCase().trim();
  if (!str) return false;

  // Always count if it contains a hyperlink
  if (/https?:\/\/|doi:10\.\d{4,9}\//.test(str)) return true;

  if (str.length > 700) return false;

  let citationScore = 0;

  if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(str)) citationScore++; // Name
  if (/\b(19|20)\d{2}\b/.test(str) || /[‘’']\d{2}/.test(str)) citationScore++; // Date

  const keywords = [
    'professor', 'phd', 'journal', 'published in',
    'fellow', 'analyst', 'researcher', 'editor',
    'university', 'institute', 'department', 'report',
    'energy', 'military', 'government', 'agency',
    'center', 'organisation', 'organization'
  ];
  if (keywords.some(word => str.includes(word))) citationScore++;

  const uppercaseOrgs = /\b[A-Z]{2,6}\b/; // e.g., DOE, NATO
  if (uppercaseOrgs.test(str)) citationScore++;

  return citationScore >= 2;
}

    function getAlign(el: HTMLElement): string {
      const align = el.getAttribute('data-text-align');
      const style = el.getAttribute('style') || '';
      const match = style.match(/text-align:\s*(\w+)/);
      if (align && ['left', 'right', 'center', 'justify'].includes(align)) {
        return ` style="text-align: ${align};"`;
      } else if (match && ['left', 'right', 'center', 'justify'].includes(match[1])) {
        return ` style="text-align: ${match[1]};"`;
      }
      return '';
    }

    let i = 0;
    while (i < allElements.length) {
      const el = allElements[i];

const hasHttpInHeading =
  /(https?:\/\/)/i.test(el.textContent || '') ||
  !!(el as HTMLElement).querySelector?.('a[href^="http"]');
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName) && !hasHttpInHeading && !isCitation(el as any)) {
        const align = getAlign(el as HTMLElement);
        output.push(`<${el.tagName.toLowerCase()}${align}>${el.innerHTML}</${el.tagName.toLowerCase()}>`);
        i++;
        continue;
      }

      if (el.tagName !== 'P' || !el.textContent?.trim()) {
        i++;
        continue;
      }

      const para = el as HTMLParagraphElement;
      if (!isCitation(para)) {
        i++;
        continue;
      }

      // const citationText = Array.from(para.querySelectorAll('strong, b'))
      //   .map(el => el.textContent?.trim() || '')
      //   .filter(Boolean)
      //   .join(' ');
      const citationText = extractCitationText(para as HTMLElement);


      let tagText = '';
if (i > 0) {
  const prev = allElements[i - 1];
  const tagCandidate = prev.textContent?.replace(/\u00a0/g, ' ').trim() || '';
  if (['H3', 'H4'].includes(prev.tagName)) output.pop();
  if (
    ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(prev.tagName) ||
    (prev.tagName === 'P' && (
      tagCandidate.length < 200 ||
      isFullyBoldParagraph(prev as HTMLParagraphElement)
    ))
  ) {
    tagText = tagCandidate.replace(/^\.+/, '');
  }
}

      let j = i + 1;
      let bodyText = '';
      while (j < allElements.length && allElements[j].tagName === 'P' && !isCitation(allElements[j] as HTMLParagraphElement)) {
        const spanText = Array.from(allElements[j].querySelectorAll("span[style*='background-color']"))
          .filter(span => {
            const style = span.getAttribute("style")?.toLowerCase() || "";
            const bgColor = style.match(/background-color:\s*([^;]+)/)?.[1]?.trim() || "";
            return (
              bgColor &&
              bgColor !== "transparent" &&
              bgColor !== "rgba(0, 0, 0, 0)" &&
              bgColor !== "white" &&
              bgColor !== "#ffffff" &&
              bgColor !== "rgb(255, 255, 255)"
            );
          })
          .map(span => span.textContent?.trim() || '')
          .join(' ');
        bodyText += spanText + ' ';
        j++;
      }

      if ( bodyText.trim()) {
        const align = getAlign(para);
        output.push(`<p${align}>${tagText ? `<b>${tagText}</b> ` : ''}<b>${citationText}</b>: ${bodyText.trim()}</p>`);
      }

      i = j;
    }

    return output.join('\n');
  }

  if (!isClient || !editor) return null;

  return (
    <div className="px-5 pt-5 pb-5 text-[12pt] h-[calc(100vh-48px)] flex flex-col">

<div className="mb-4">
  <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
    Rhetorify
    <Link
      href="/main/known-bugs"
      className="circlebutton"
      aria-label="Known bugs"
      title="Known bugs"
    >
      <FaBug size={16} />
    </Link>
  </h1>
  <div className="w-40 h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mt-1.5" />
</div>


        <div className="hidden sm:block text-[10px] text-gray-500 defaulttext px-3 py-2 rounded-lg bg-white shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white max-w-sm leading-snug fixed bottom-4 right-12 z-50 ">
          ⚠️ Disclaimer, we don't store any of your cards, check FAQs for more info.
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
        <div className="flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Editor (Word users: paste into google docs first, and then editor)</h2>
            <button
              onClick={() => editor.commands.clearContent()}
              className="text-gray-500 hover:text-black text-sm hover:scale-105 transition-transform dark:text-white dark:hover:text-gray-400 cursor-pointer"
              title="Clear Editor"
            >
              <FiX size={18} />
            </button>
          </div>
          <div
            className="bg-white rounded-lg border shadow-sm p-4 flex-1 overflow-auto text-black"
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} className="w-full h-full outline-none" />
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Output</h2>
            <button
              onClick={async () => {
                const blob = new Blob([rhetorifiedHtml], { type: 'text/html' });
                await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
              }}
              className="text-gray-500 hover:text-black text-sm hover:scale-105 transition-transform dark:text-white dark:hover:text-gray-400 cursor-pointer"
              title="Copy Output"
            >
              <FiCopy size={18} />
            </button>
          </div>
          <div
            className="bg-white rounded-lg border shadow-sm p-4 flex-1 overflow-auto whitespace-pre-wrap text-black"
            dangerouslySetInnerHTML={{ __html: rhetorifiedHtml }}
          />
        </div>
      </div>
    </div>
  );
}
