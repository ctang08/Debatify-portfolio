
'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { HighlightStyle } from '@/app/extensions/HighlightStyle';
import { FiCopy, FiX } from 'react-icons/fi';
import DOMPurify from 'dompurify';


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

  useEffect(() => setIsClient(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      HighlightStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p>Paste cut cards here...</p>',
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
        ALLOWED_TAGS: ['p', 'strong', 'b', 'i', 'em', 'u', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['style', 'data-text-align'],
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
        ALLOWED_TAGS: ['p', 'strong', 'b', 'i', 'em', 'u', 'span', 'br', 'h1', 'h2', 'h3', 'h4'],
        ALLOWED_ATTR: ['style'],
        KEEP_CONTENT: true,
      });
      setRhetorifiedHtml(filterInlineStyles(clean));
    }
  }, [html]);

  function rhetorify(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const allElements = Array.from(doc.body.children);
    const output: string[] = [];

    function isCitation(para: HTMLParagraphElement | null | undefined): boolean {
      const str = ((para && para.textContent) || '').toLowerCase().trim();
      if (/https:\/\//.test(str) || /www\./.test(str)) return true;
      if (str.length > 500) return false;

      let citationScore = 0;
      if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(str)) citationScore++;
      if (/\b(19|20)\d{2}\b/.test(str) || /[‘’']\d{2}/.test(str)) citationScore++;

      const keywords = [
        'professor', 'phd', 'journal', 'published in',
        'fellow', 'analyst', 'researcher', 'editor',
        'university', 'institute',
      ];
      if (keywords.some(word => str.includes(word))) citationScore++;

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

      if (['H1', 'H2', 'H3', 'H4'].includes(el.tagName)) {
        const align = getAlign(el as HTMLElement);
        output.push(`<${el.tagName.toLowerCase()}${align}>${el.innerHTML}</${el.tagName.toLowerCase()}>`);
        i++;
        continue;
      }

      if (el.tagName !== 'P') {
        i++;
        continue;
      }

      const para = el as HTMLParagraphElement;
      if (!isCitation(para)) {
        i++;
        continue;
      }

      const citationText = Array.from(para.querySelectorAll('strong, b'))
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');

      let tagText = '';
      if (i > 0) {
        const prev = allElements[i - 1];
        const tagCandidate = prev.textContent?.trim() || '';
        if (['H3', 'H4'].includes(prev.tagName)) output.pop();
        if (
          ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(prev.tagName) ||
          (prev.tagName === 'P' && tagCandidate.length < 100)
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
            return !style.includes("transparent") && !style.includes("rgba(0, 0, 0, 0)");
          })
          .map(span => span.textContent?.trim() || '')
          .join(' ');
        bodyText += spanText + ' ';
        j++;
      }

      if (citationText && bodyText.trim()) {
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
      <div className="flex-col">
        <h1 className="text-3xl font-semibold mb-1 tracking-tight">Rhetorify</h1>
        <div className="w-40 h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mb-4" />
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
