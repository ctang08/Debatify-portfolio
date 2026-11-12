'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FiCopy, FiBookmark, FiX } from 'react-icons/fi';

// Ensure an "A2 " prefix without duplicating it
const A2_PREFIX_RE = /^A2(?:\s|:|-)/i;
function addA2Prefix(s: string): string {
  const t = (s || '').trim();
  if (!t) return 'A2';
  return A2_PREFIX_RE.test(t) ? t : `A2 ${t}`;
}

async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

// ---------- A2 label helpers (Pro -> A2 Con, Con -> A2 Pro) ----------
function a2LabelFromSide(
  side: string | undefined,
  casing: 'lower' | 'upper' | 'title' = 'title'
): string {
  const s = (side || '').toLowerCase();
  let label = s === 'pro' ? 'a2 con' : s === 'con' ? 'a2 pro' : side || '';
  if (casing === 'upper') return label.toUpperCase();
  if (casing === 'lower') return label.toLowerCase();
  // Title case words, leave A2 intact
  return label.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// -------------------- tiny DOM helpers --------------------
function removeFontSizeStyles(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const spans = doc.querySelectorAll('span[style*="font-size" i]');
    spans.forEach((span) => {
      const style = span.getAttribute('style') || '';
      const cleaned = style
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !/\bfont-size\b/i.test(s))
        .join(';');
      if (cleaned) span.setAttribute('style', cleaned);
      else span.removeAttribute('style');
    });
    return doc.body.innerHTML;
  } catch {
    return html || '';
  }
}

function stripHtmlToText(html?: string | null): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/'/g, '"'));
  }
}

// -------------------- text utilities --------------------
function canonicalTopic(s: string): string {
  if (!s) return '';
  let t = String(s)
    .replace(/\u00A0/g, ' ')
    .replace(/["']/g, '')
    .replace(/\s+[.!?]$/g, (m) => m.trim())
    .replace(/[.!?]+$/g, '');
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Remove (...) / [...] segments **with their contents**. (ASCII + fullwidth, nested) */
function removeAllBracketedSegments(input: string): string {
  if (!input) return '';
  let s = String(input);
  const patterns = [
    /\([^()]*\)/g,
    /\[[^\[\]]*\]/g,
    /（[^（）]*）/g,
    /［[^［］]*］/g,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of patterns) {
      const before = s;
      s = s.replace(re, '');
      if (s !== before) changed = true;
    }
  }
  return s;
}

function cleanDisplayKey(input: string): string {
  if (!input) return '';
  let t = String(input);

  // 1) drop bracketed content (and the brackets)
  t = removeAllBracketedSegments(t);

  // 2) collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();

  // 3) drop everything before first ASCII letter/number
  const firstAlnumIdx = t.search(/[A-Za-z0-9]/);
  if (firstAlnumIdx > 0) t = t.slice(firstAlnumIdx);

  // 4) strip leading/trailing dash variants + whitespace
  const DASH = '\u2010\u2011\u2012\u2013\u2014\u2015\u2212-';
  const edgeDash = new RegExp(`^[\\s${DASH}]+|[\\s${DASH}]+$`, 'gu');
  t = t.replace(edgeDash, '').trim();

  // 5) remove trailing numbers (and any spaces/dashes/colon/middle dot before them)
  const TRAIL_NUM_RE = /[\s\u2010\u2011\u2012\u2013\u2014\u2015\u2212\-·:]*\d+\s*$/u;
  t = t.replace(TRAIL_NUM_RE, '').trim();

  // 6) clean up again
  t = t.replace(edgeDash, '').trim();

  return t;
}

function normalizeMarkdownForDedup(md?: string | null): string {
  if (!md) return '';
  const tail = md.slice(50);
  return tail.replace(/\s+/g, '').toLowerCase();
}

// -------------------- team + version parsing --------------------
function splitCamelOnce(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_]+/g, ' ').trim();
}

function extractTeamNameFromLink(link?: string | null): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    const pathParam = u.searchParams.get('path') || '';
    if (pathParam) {
      const decoded = decodeURIComponent(pathParam);
      const parts = decoded.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const school = splitCamelOnce(parts[1] || '');
        const pair = (parts[2] || '').replace(/[_]+/g, ' ').trim();
        const team = `${school} ${pair}`.trim();
        if (team) return team;
      }
      const file = parts[parts.length - 1] || '';
      const base = file.replace(/\.[^.]+$/, '');
      const m = base.match(/^([^-\s]+)-([^-\s]+)-(Pro|Con)\b/i);
      if (m) {
        const school = splitCamelOnce(m[1]);
        const pair = m[2];
        const team = `${school} ${pair}`.trim();
        if (team) return team;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

type VersionInfo = {
  label: string;
  tournamentKey: string;
  round: number;
  isNumeric: boolean;
};

function parseVersionLabelFromLink(link?: string | null): VersionInfo {
  const FALLBACK: VersionInfo = {
    label: 'R1 Unknown',
    tournamentKey: 'unknown',
    round: 1,
    isNumeric: true,
  };
  if (!link) return FALLBACK;

  try {
    const u = new URL(link);
    const pathParam = u.searchParams.get('path') || '';
    if (!pathParam) return FALLBACK;

    const decoded = decodeURIComponent(pathParam);
    const file = decoded.split('/').filter(Boolean).pop() || '';
    const base = file.replace(/\.[^.]+$/, '');
    const tokens = base.split('-').map((t) => t.trim()).filter(Boolean);

    let iPC = tokens.findIndex((t) => /^pro$/i.test(t) || /^con$/i.test(t));
    if (iPC === -1) iPC = 0;

    let j = iPC + 1;
    if (j < tokens.length && /^[0-9]+\.?$/.test(tokens[j])) j++;

    const tailTokens = tokens.slice(j);
    const tailStr = tailTokens.join(' ').replace(/\s+/g, ' ').trim();
    if (!tailStr) return FALLBACK;

    let numRound: number | null = null;
    const mRound1 = /(?:^|\s)Round[-\s]*([0-9]+)\b/gi;
    const mRound2 = /(?:^|\s)R([0-9]+)\b/gi;
    let last: RegExpExecArray | null = null;
    let exec: RegExpExecArray | null;

    while ((exec = mRound1.exec(tailStr))) last = exec;
    while ((exec = mRound2.exec(tailStr))) last = exec || last;

    if (last) numRound = Number(last[1]);

    let tournament = tailStr;
    if (numRound !== null) {
      tournament = tournament
        .replace(/(?:^|\s)Round[-\s]*[0-9]+\b/i, '')
        .replace(/(?:^|\s)R[0-9]+\b/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      const words = tailStr.split(/\s+/);
      const lastWord = words[words.length - 1];
      const tournamentOnly = words.slice(0, -1).join(' ').trim() || 'Unknown';
      const name = lastWord.toLowerCase();
      const map: Record<string, number> = {
        octofinals: 110,
        double: 115,
        triple: 116,
        quadruple: 117,
        quarters: 120,
        quarterfinals: 120,
        semis: 130,
        semifinals: 130,
        final: 140,
        finals: 140,
        elim: 150,
        elims: 150,
      };
      const labelWord = lastWord[0].toUpperCase() + lastWord.slice(1);
      return {
        label: `${labelWord} ${tournamentOnly}`.trim(),
        tournamentKey: tournamentOnly.toLowerCase(),
        round: map[name] ?? 199,
        isNumeric: false,
      };
    }

    return {
      label: `R${numRound} ${tournament}`.trim(),
      tournamentKey: tournament.toLowerCase(),
      round: Number.isFinite(numRound) ? (numRound as number) : 1,
      isNumeric: true,
    };
  } catch {
    return FALLBACK;
  }
}

// -------------------- types --------------------
export type ContentionEntry = {
  id: number | string;
  title?: string;
  markdown?: string;
  link?: string;
  topic?: string;
  side?: string; // 'pro' | 'con'
  [key: string]: any;
};
export type ContentionsByKey = Record<string, ContentionEntry[]>;

// -------------------- search helpers --------------------
function normalize(s: string): string {
  return (s || '').toLowerCase();
}
function tokenize(q: string): string[] {
  return normalize(q).split(/[^a-z0-9]+/i).map((t) => t.trim()).filter(Boolean);
}
function scoreField(text: string, terms: string[], base: number): number {
  if (!text || terms.length === 0) return 0;
  const hay = normalize(text);
  const tokens = hay.split(/[^a-z0-9]+/i);
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += base;
    if (hay.startsWith(term)) score += base * 0.5;
    if (tokens.includes(term)) score += base * 0.75;
  }
  return score;
}
function baseKeyOf(rawKey: string): string {
  return (rawKey || '').split('||')[0] || rawKey;
}
function sideFromKey(rawKey: string): 'pro' | 'con' | undefined {
  const parts = (rawKey || '').split('||');
  const s = parts.length > 1 ? (parts[1] || '').toLowerCase() : undefined;
  return s === 'pro' || s === 'con' ? s : undefined;
}
function pickRepresentative(entries: ContentionEntry[]): ContentionEntry | undefined {
  if (!entries || entries.length === 0) return undefined;
  const byIdOne = entries.find((e) => String(e.id) === '1');
  return byIdOne || entries[0];
}

// -------------------- HTML sanitization (keeps <mark>) --------------------
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
  'text-align',
]);
function filterInlineStyles(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    doc.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const safe = style
        .split(';')
        .map((s) => s.trim())
        .filter((rule) => {
          if (!rule) return false;
          const [prop] = rule.split(':').map((s) => s.trim().toLowerCase());
          return allowedCSSProps.has(prop);
        })
        .join('; ');
      if (safe) el.setAttribute('style', safe);
      else el.removeAttribute('style');
    });
    return doc.body.innerHTML;
  } catch {
    return html || '';
  }
}
function sanitizeHtml(html: string): string {
  const safe = DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'strong', 'b', 'i', 'em', 'u', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'mark'],
    ALLOWED_ATTR: ['style', 'data-text-align', 'href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });
  return filterInlineStyles(safe);
}

// ===== highlight decoration (convert <mark> to colored spans) =====
function decorateMarks(html: string, color: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const marks = Array.from(doc.querySelectorAll('mark'));
    for (const m of marks) {
      const span = doc.createElement('span');
      span.setAttribute(
        'style',
        `background-color: ${color}; padding: 2px; text-decoration: underline;`
      );
      span.innerHTML = m.innerHTML;
      m.replaceWith(span);
    }
    return doc.body.innerHTML;
  } catch {
    return (html || '').replace(
      /<mark>([\s\S]*?)<\/mark>/gi,
      `<span style="background-color:${color}; padding:2px; text-decoration: underline;">$1</span>`
    );
  }
}

async function copyHtmlToClipboard(html: string) {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    // @ts-ignore
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
  } catch {
    await navigator.clipboard.writeText(stripHtmlToText(html));
  }
}

// -------------------- UI control classes --------------------
const CONTROL =
  'simpleform text-sm py-1 px-2 h-9 w-full sm:w-[8rem] hover:scale-100 focus:scale-100 transition-none transform-none';
const TOPIC_CONTROL = CONTROL;
const TRUNC_ONE = 'block w-full overflow-hidden text-ellipsis whitespace-nowrap';

// -------------------- Component --------------------
export default function ContentionBrowser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContentionsByKey>({});

  // NEW: topic is a dataset selector (none by default)
  const TOPIC_NONE_VALUE = '__NONE__';
  const [topicFilter, setTopicFilter] = useState<string>(TOPIC_NONE_VALUE);
  const [sideFilter, setSideFilter] = useState<'All' | 'pro' | 'con'>('All');
  const [search, setSearch] = useState<string>('');

  const [highlightColor, setHighlightColor] = useState('#fdff00');
  const [fontClass, setFontClass] = useState('calibri');

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ContentionEntry | null>(null);
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({});

  type SortMode = 'AZ' | 'Popular' | 'Search';
  const [sortMode, setSortMode] = useState<SortMode>('AZ');

  const router = useRouter();

  // Bookmarks (blockbookmarks table)
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [bmBusy, setBmBusy] = useState(false);

  type BookmarkFilter = 'All' | 'Bookmarked';
  const [bookmarkFilter, setBookmarkFilter] = useState<BookmarkFilter>('All');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const uid = await getUserId();
      if (!uid) {
        if (mounted) setBookmarkIds(new Set());
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blockbookmarks')
        .select('entry_id')
        .eq('user_id', uid);

      if (!mounted) return;
      if (error) {
        console.warn('bookmark load error', error);
        setBookmarkIds(new Set());
        return;
      }
      setBookmarkIds(new Set((data ?? []).map((r: any) => String(r.entry_id))));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function toggleBookmark(entryIdRaw: number | string | undefined) {
    if (entryIdRaw == null) return;
    const id = String(entryIdRaw);

    setBmBusy(true);
    const before = new Set(bookmarkIds);
    const next = new Set(bookmarkIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBookmarkIds(next);

    try {
      const uid = await getUserId();
      if (!uid) {
        router.push('/main/pricing');
        setBookmarkIds(before);
        return;
      }

      const supabase = createClient();
      if (before.has(id)) {
        const { error } = await supabase
          .from('blockbookmarks')
          .delete()
          .eq('user_id', uid)
          .eq('entry_id', id);
        if (error) {
          console.error(error);
          setBookmarkIds(before);
        }
      } else {
        const { error } = await supabase
          .from('blockbookmarks')
          .insert({ user_id: uid, entry_id: id });
        if (error) {
          console.error(error);
          setBookmarkIds(before);
        }
      }
    } finally {
      setBmBusy(false);
    }
  }

  // NEW: fetch blocks ONLY when a topic is selected
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (topicFilter === TOPIC_NONE_VALUE) {
        if (mounted) {
          setData({});
          setLoading(false);
          setError(null);
          setSelectedGroupId(null);
          setSelectedEntry(null);
          setOpenTeams({});
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let url = `${process.env.NEXT_PUBLIC_EVIDENCE_API_URL || ''}/rebuttal/data`; // default
        if (topicFilter === 'septober') {
          url = `${process.env.NEXT_PUBLIC_EVIDENCE_API_URL || ''}/rebuttal/data/septober`;
        } else if (topicFilter === 'nocember') {
          url = `${process.env.NEXT_PUBLIC_EVIDENCE_API_URL || ''}/rebuttal/data/nocember`;
        }

        const json = (await fetchJson(url)) as ContentionsByKey;
        if (mounted) {
          setData(json || {});
          setSelectedGroupId(null);
          setSelectedEntry(null);
          setOpenTeams({});
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [topicFilter]);

  type Group = {
    id: string;
    baseKey: string;
    sideNormalized: 'pro' | 'con' | 'unknown';
    rawKeys: string[];
    allEntries: ContentionEntry[];
    representative?: ContentionEntry;
    representativeSide?: 'pro' | 'con';
  };

  const groups = useMemo(() => {
    const m = new Map<string, Group>();
    const mdSeenMap = new Map<string, Set<string>>();

    Object.entries(data || {}).forEach(([rawKey, entries]) => {
      const baseRaw = baseKeyOf(rawKey);
      const cleaned = cleanDisplayKey(baseRaw);
      if (!cleaned) return;

      const rkSide = sideFromKey(rawKey);
      let sideNorm: 'pro' | 'con' | 'unknown' = rkSide ?? 'unknown';
      if (!rkSide && Array.isArray(entries) && entries.length) {
        const set = new Set(
          entries.map((e) => (e?.side || '').toLowerCase()).filter((s) => s === 'pro' || s === 'con')
        ) as Set<'pro' | 'con'>;
        if (set.size === 1) sideNorm = Array.from(set)[0];
      }

      const id = `${cleaned}||${sideNorm}`;
      const g = m.get(id) || {
        id,
        baseKey: cleaned,
        sideNormalized: sideNorm,
        rawKeys: [],
        allEntries: [],
      };
      const seen = mdSeenMap.get(id) || new Set<string>();

      g.rawKeys.push(rawKey);

      if (Array.isArray(entries)) {
        for (const e of entries) {
          const norm = normalizeMarkdownForDedup(e?.markdown);
          if (e?.markdown) {
            if (seen.has(norm)) continue;
            seen.add(norm);
          }
          g.allEntries.push(e);
        }
      }

      mdSeenMap.set(id, seen);
      m.set(id, g);
    });

    for (const g of m.values()) {
      g.representative = pickRepresentative(g.allEntries);
      g.representativeSide =
        g.sideNormalized === 'pro' || g.sideNormalized === 'con' ? g.sideNormalized : undefined;
    }

    const order: Record<'pro' | 'con' | 'unknown', number> = { pro: 0, con: 1, unknown: 2 };
    return Array.from(m.values()).sort(
      (a, b) =>
        a.baseKey.localeCompare(b.baseKey) || order[a.sideNormalized] - order[b.sideNormalized]
    );
  }, [data]) as Group[];

  function countTeamsForGroup(g: Group): number {
    const set = new Set<string>();
    for (const e of g.allEntries) {
      const s = (e?.side || '').toLowerCase();
      if (g.sideNormalized === 'pro' || g.sideNormalized === 'con') {
        if (s !== g.sideNormalized) continue;
      }
      set.add(extractTeamNameFromLink(e.link || '') || `Entry ${e.id}`);
    }
    return set.size;
  }

  function teamNamesForGroup(g: Group): string {
    const set = new Set<string>();
    for (const e of g.allEntries) {
      const s = (e?.side || '').toLowerCase();
      if (g.sideNormalized === 'pro' || g.sideNormalized === 'con') {
        if (s !== g.sideNormalized) continue;
      }
      set.add((extractTeamNameFromLink(e.link || '') || '').toLowerCase());
    }
    return Array.from(set).join(' ');
  }

  // NEW: static topic choices as dataset selector
  const topicChoices: { label: string; value: string }[] = useMemo(
    () => [
      { label: 'Select Topic…', value: TOPIC_NONE_VALUE },
      { label: 'Public Forum Septober', value: 'septober' },
      { label: 'Public Forum Nocember', value: 'nocember' },
    ],
    []
  );

  // Filter + search across key/title/markdown (topicFilter no longer filters entries)
  const filteredGroups = useMemo(() => {
    const baseFiltered = groups.filter((g) => {
      const rep = g.representative;
      if (!rep) return false;

      if (sideFilter !== 'All') {
        if (g.sideNormalized !== sideFilter) return false;
      }

      return true;
    });

    const afterBookmarks =
      bookmarkFilter === 'Bookmarked'
        ? baseFiltered.filter((g) =>
            g.allEntries.some((e) => bookmarkIds.has(String(e.id)))
          )
        : baseFiltered;

    if (sortMode === 'Search') {
      const q = search.trim();
      if (!q) {
        return [...afterBookmarks].sort((a, b) => a.baseKey.localeCompare(b.baseKey));
      }

      const terms = tokenize(q);
      return afterBookmarks
        .map((g) => {
          let score = 0;
          score += scoreField(g.baseKey, terms, 10);
          const teamNames = teamNamesForGroup(g);
          score += scoreField(teamNames, terms, 8);
          for (const e of g.allEntries) {
            if (e?.title) score += scoreField(stripHtmlToText(e.title), terms, 5);
          }
          for (const e of g.allEntries) {
            if (!e?.markdown) continue;
            const body = stripHtmlToText(e.markdown).slice(0, 8000);
            score += scoreField(body, terms, 1);
          }
          return { g, score };
        })
        .filter(({ score }) => score > 0)
        .sort(
          (a, b) =>
            b.score - a.score || a.g.baseKey.localeCompare(b.g.baseKey)
        )
        .map(({ g }) => g);
    }

    if (sortMode === 'Popular') {
      return [...afterBookmarks].sort((a, b) => {
        const ca = countTeamsForGroup(a);
        const cb = countTeamsForGroup(b);
        if (cb !== ca) return cb - ca;
        return a.baseKey.localeCompare(b.baseKey);
      });
    }

    return [...afterBookmarks].sort((a, b) => a.baseKey.localeCompare(b.baseKey));
  }, [groups, sideFilter, sortMode, search, bookmarkFilter, bookmarkIds]);

  useEffect(() => {
    if (!selectedGroupId || !filteredGroups.some((g) => g.id === selectedGroupId)) {
      const first = filteredGroups[0]?.id || null;
      setSelectedGroupId(first);
      setSelectedEntry(null);
      setOpenTeams({});
    }
  }, [filteredGroups, selectedGroupId]);

  const currentGroup = useMemo(
    () => filteredGroups.find((g) => g.id === selectedGroupId) || null,
    [filteredGroups, selectedGroupId]
  );

  const currentEntries = useMemo((): ContentionEntry[] => {
    if (!currentGroup) return [];

    const filtered = currentGroup.allEntries.filter((e) => {
      const s = (e?.side || '').toLowerCase();
      if (currentGroup.sideNormalized === 'pro' || currentGroup.sideNormalized === 'con') {
        return s === currentGroup.sideNormalized;
      }
      return true;
    });

    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    filtered.sort((a, b) => toNum(a.id) - toNum(b.id));

    if (bookmarkFilter === 'Bookmarked') {
      return filtered.filter((e) => bookmarkIds.has(String(e.id)));
    }

    return filtered;
  }, [currentGroup, bookmarkFilter, bookmarkIds]);

  useEffect(() => {
    if (!selectedEntry && currentEntries.length > 0) setSelectedEntry(currentEntries[0]);
  }, [currentEntries, selectedEntry]);

  type TeamBucket = {
    team: string;
    versions: Array<{
      entry: ContentionEntry;
      label: string;
      tournamentKey: string;
      round: number;
      isNumeric: boolean;
    }>;
  };

  const teamBuckets = useMemo<TeamBucket[]>(() => {
    const map = new Map<string, TeamBucket>();

    for (const e of currentEntries) {
      const team = extractTeamNameFromLink(e.link || '') || `Entry ${e.id}`;
      const v = parseVersionLabelFromLink(e.link || '');
      const bucket = map.get(team) || { team, versions: [] };
      bucket.versions.push({
        entry: e,
        label: v.label,
        tournamentKey: v.tournamentKey,
        round: v.round,
        isNumeric: v.isNumeric,
      });
      map.set(team, bucket);
    }

    for (const b of map.values()) {
      b.versions.sort((a, z) => {
        const t = a.tournamentKey.localeCompare(z.tournamentKey);
        if (t !== 0) return t;
        if (a.isNumeric !== z.isNumeric) return a.isNumeric ? -1 : 1;
        if (a.round !== z.round) return a.round - z.round;
        return a.label.localeCompare(z.label);
      });
    }

    const all = Array.from(map.values());
    const folders = all
      .filter((b) => b.versions.length > 1)
      .sort((a, z) => a.team.localeCompare(z.team));
    const singles = all
      .filter((b) => b.versions.length === 1)
      .sort((a, z) => a.team.localeCompare(z.team));

    return [...folders, ...singles];
  }, [currentEntries]);

  const teamCountMap = useMemo(() => {
    const m = new Map<string, number>();
    const restrictToBookmarks = bookmarkFilter === 'Bookmarked';

    for (const g of filteredGroups) {
      const set = new Set<string>();

      for (const e of g.allEntries) {
        const s = (e?.side || '').toLowerCase();
        if (g.sideNormalized === 'pro' || g.sideNormalized === 'con') {
          if (s !== g.sideNormalized) continue;
        }

        if (restrictToBookmarks && !bookmarkIds.has(String(e.id))) continue;

        set.add(extractTeamNameFromLink(e.link || '') || `Entry ${e.id}`);
      }

      m.set(g.id, set.size);
    }

    return m;
  }, [filteredGroups, bookmarkFilter, bookmarkIds]);

  const selectedCleanHtml = useMemo(
    () => sanitizeHtml(selectedEntry?.markdown || ''),
    [selectedEntry]
  );
  const selectedDecoratedHtml = useMemo(
    () => decorateMarks(selectedCleanHtml, highlightColor),
    [selectedCleanHtml, highlightColor]
  );
  const selectedTeam = useMemo(
    () => extractTeamNameFromLink(selectedEntry?.link || ''),
    [selectedEntry]
  );

  return (
    <div className="flex flex-col gap-3 p-4 defaulttext">
      {/* Header */}
      <div className="w-fit">
        <h1 className="text-3xl font-semibold tracking-tight">Browse Blocks</h1>
        <div className="w-full h-1 bg-gray-800 dark:bg-white rounded-full opacity-80 mt-1.5" />
      </div>

      {/* Loading / Error */}
      {loading && <p>Loading blocks…</p>}
      {error && !loading && <p className="text-red-600">Error loading: {error}</p>}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <select
            className={TOPIC_CONTROL}
            value={topicFilter}
            onChange={(e) => {
              setTopicFilter(e.target.value);
              setSearch('');
              setSortMode('AZ');
            }}
            title="Select Public Forum topic / dataset"
          >
            {topicChoices.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className={TOPIC_CONTROL}
            value={bookmarkFilter}
            onChange={(e) => setBookmarkFilter(e.target.value as BookmarkFilter)}
            title="Show all blocks or only your bookmarks"
          >
            <option value="All">All Blocks</option>
            <option value="Bookmarked">Bookmarked Blocks</option>
          </select>

          <select
            className={CONTROL}
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as 'All' | 'pro' | 'con')}
            title="Filter by Side"
          >
            <option value="All">All Sides</option>
            {/* keep values 'pro'/'con', change visible labels */}
            <option value="pro">{a2LabelFromSide('pro', 'title')}</option>
            <option value="con">{a2LabelFromSide('con', 'title')}</option>
          </select>

          <select
            className={CONTROL}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            title="Sort keys"
          >
            <option value="AZ">A–Z</option>
            <option value="Popular">Popularity</option>
            <option value="Search">Search</option>
          </select>

          {sortMode === 'Search' && (
            <input
              type="text"
              className={`${CONTROL} sm:w-[12rem]`}
              placeholder="Search arguments/teams"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              title="Weighted search across key name, teams, titles, and markdown"
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <select
            className={CONTROL}
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            title="Highlight color for marked text"
          >
            <option value="#fdff00">Yellow</option>
            <option value="#00ffff">Cyan</option>
            <option value="#00ff00">Green</option>
          </select>

          <select
            className={CONTROL}
            value={fontClass}
            onChange={(e) => setFontClass(e.target.value)}
            title="Viewer font"
          >
            <option value="calibri">Calibri</option>
            <option value="arial">Arial</option>
            <option value="times">Times New Roman</option>
            <option value="comic">Comic Sans</option>
          </select>
        </div>
      </div>

      {topicFilter === TOPIC_NONE_VALUE && !loading && (
        <div className="text-sm opacity-70 mt-1">
          Select a topic above (e.g., <strong>Public Forum Septober</strong> or{' '}
          <strong>Public Forum Nocember</strong>) to load blocks.
        </div>
      )}

      {/* Panes */}
      {!loading && topicFilter !== TOPIC_NONE_VALUE && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: keys */}
          <div className="w-full lg:w-[22%] rounded-md overflow-y-auto max-h-[25vh] lg:max-h-[78vh] border border-gray-300">
            <ul className="divide-y divide-gray-200">
              {filteredGroups.map((g) => (
                <li key={g.id}>
                  <button
                    className={`block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing ${
                      selectedGroupId === g.id ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                    }`}
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setSelectedEntry(null);
                      setOpenTeams({});
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <span className="min-w-0 max-w-[68%] sm:max-w-[70%] break-words leading-snug">
                        {addA2Prefix(g.baseKey)}
                      </span>
                      <span className="text-xs opacity-70 flex items-center gap-1 shrink-0">
                        {g.representativeSide && (
                          <span>{a2LabelFromSide(g.representativeSide, 'lower')}</span>
                        )}
                        <span className="opacity-50">·</span>
                        <span>
                          {(teamCountMap.get(g.id) ?? 0)}{' '}
                          {(teamCountMap.get(g.id) ?? 0) === 1 ? 'team' : 'teams'}
                        </span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
              {filteredGroups.length === 0 && (
                <li className="px-3 py-2 text-sm opacity-70">No keys match the filters.</li>
              )}
            </ul>
          </div>

          {/* Middle: teams */}
          <div className="w-full lg:w-[15%] rounded-md overflow-y-auto max-h-[50vh] lg:max-h-[78vh] border border-gray-300">
            <ul className="divide-y divide-gray-200">
              {teamBuckets.map((b) => {
                const isFolder = b.versions.length > 1;
                const isOpen = !!openTeams[b.team];

                if (!isFolder) {
                  const only = b.versions[0];
                  const isSelected =
                    selectedEntry && String(selectedEntry.id) === String(only.entry.id);
                  return (
                    <li key={b.team}>
                      <button
                        className={`block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                          isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                        onClick={() => setSelectedEntry(only.entry)}
                        title={b.team}
                      >
                        <div className="text-sm whitespace-normal break-words leading-snug">
                          {b.team}
                        </div>
                        <div className={`text-xs opacity-75 ${TRUNC_ONE}`}>{only.label}</div>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={b.team}>
                    <button
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() =>
                        setOpenTeams((s) => ({
                          ...s,
                          [b.team]: !s[b.team],
                        }))
                      }
                      title={b.team}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block transition-transform select-none ${
                            isOpen ? 'rotate-90' : 'rotate-0'
                          }`}
                          aria-hidden
                        >
                          ▸
                        </span>
                        <span className="text-sm font-semibold whitespace-normal break-words leading-snug">
                          {b.team}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <ul className="divide-y divide-gray-100">
                        {b.versions.map((v) => {
                          const isSelected =
                            selectedEntry && String(selectedEntry.id) === String(v.entry.id);
                          return (
                            <li key={String(v.entry.id)}>
                              <button
                                className={`block w-full text-left pl-8 pr-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                                  isSelected ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''
                                }`}
                                onClick={() => setSelectedEntry(v.entry)}
                                title={v.label}
                              >
                                <span className={`text-sm ${TRUNC_ONE}`}>{v.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
              {teamBuckets.length === 0 && (
                <li className="px-3 py-2 text-sm opacity-70">No entries.</li>
              )}
            </ul>
          </div>

          {/* Right: viewer */}
          <div
            className={`w-full lg:flex-1 rounded-md overflow-y-auto max-h-[60vh] lg:max-h-[78vh] border border-gray-300 p-4 bg-white dark:bg-gray-100 text-black ${fontClass}`}
          >
            {selectedEntry ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {selectedEntry.link ? (
                      <a
                        href={selectedEntry.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block simpleform px-3 py-1 w-fit hover:scale-101"
                      >
                        Download File (make sure you're logged into OpenCaselist)
                      </a>
                    ) : (
                      <div className="text-sm opacity-60">No download link provided.</div>
                    )}
                    {selectedTeam && (
                      <span className="text-xs opacity-70">Team: {selectedTeam}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={bmBusy || !selectedEntry}
                      onClick={() => toggleBookmark(selectedEntry?.id)}
                      className={`text-sm transition-transform cursor-pointer
                        text-gray-600 hover:text-black dark:text-gray-700 dark:hover:text-gray-900
                        ${bmBusy ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                      `}
                      title={
                        bookmarkIds.has(String(selectedEntry?.id))
                          ? 'Remove bookmark'
                          : 'Bookmark this entry'
                      }
                      aria-label="Toggle bookmark"
                    >
                      {bookmarkIds.has(String(selectedEntry?.id)) ? (
                        <FiX size={18} />
                      ) : (
                        <FiBookmark size={18} />
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        const htmlToCopy = `<div>${selectedDecoratedHtml}</div>`;
                        await copyHtmlToClipboard(htmlToCopy);
                      }}
                      className="text-gray-600 hover:text-black text-sm hover:scale-105 transition-transform dark:text-gray-700 dark:hover:text-gray-900 cursor-pointer"
                      title="Copy rendered HTML (keeps highlights)"
                      aria-label="Copy rendered HTML"
                    >
                      <FiCopy size={18} />
                    </button>
                  </div>
                </div>

                {selectedEntry.title && (
                  <h2
                    className="text-xl font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: removeFontSizeStyles(selectedEntry.title),
                    }}
                  />
                )}

                <div
                  className="max-w-none reset-injected-html"
                  dangerouslySetInnerHTML={{
                    __html: selectedDecoratedHtml || '<em>No content.</em>',
                  }}
                />
              </div>
            ) : (
              <div className="opacity-60">Select an entry to preview.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
