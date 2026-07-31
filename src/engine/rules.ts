import type { PostFeatures, Signal, SlopCategory } from './types';
import {
  canonical,
  countWords,
  hasStyledUnicodeLetters,
  normalize,
  splitSentences,
  stddev,
} from './tokenize';

/** A user-defined keyword rule, configured on the options page. */
export interface KeywordRule {
  term: string;
  category: SlopCategory;
  /** Contribution to the raw rule sum. Sensible range is 0.2 – 2.0. */
  weight: number;
}

/** Precomputed views of a post, shared across every rule. */
interface RuleContext {
  /** NFKC-normalized text (lookalike bold folded to ASCII). */
  text: string;
  /** Lowercased, quote-normalized text. */
  lower: string;
  raw: string;
  lines: string[];
  sentences: string[];
  wordCount: number;
  hashtags: string[];
}

interface Rule {
  id: string;
  category: SlopCategory;
  label: string;
  weight: number;
  /** Returns the evidence string when the rule fires, else null. */
  test: (ctx: RuleContext) => string | null;
  /**
   * Optional multiplier on `weight`, for rules that scale with how much
   * evidence they found. Defaults to 1.
   */
  scale?: (ctx: RuleContext) => number;
}

/**
 * Density-based rules need enough text to be meaningful — a two-line post has
 * no meaningful sentence-length variance and no meaningful em-dash rate.
 */
const MIN_WORDS_FOR_DENSITY = 40;

/** Longest evidence snippet shown in the UI. */
const EVIDENCE_MAX = 70;

function snippet(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= EVIDENCE_MAX ? clean : `${clean.slice(0, EVIDENCE_MAX - 1)}…`;
}

/** First regex that matches wins; returns the matched text. */
function firstMatch(haystack: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(haystack);
    if (match) return match[0];
  }
  return null;
}

/** All distinct phrases from `phrases` present in `haystack` (already lowercased). */
function phraseHits(haystack: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => haystack.includes(phrase));
}

const OPENERS = [
  "here's the thing",
  'unpopular opinion',
  'let that sink in',
  'read that again',
  'let me be blunt',
  'let me be clear',
  "i'll say it louder",
  'say it louder for the people',
  'plot twist',
  'hot take',
  "let's be honest",
  "here's what nobody tells you",
  'nobody talks about this',
  'this changes everything',
  'yesterday i learned',
  'i was wrong',
  "here's why that matters",
  'stop scrolling',
];

const BAIT = [
  'agree?',
  'thoughts?',
  'what would you add',
  'what do you think?',
  'am i wrong',
  'repost if',
  'follow me for more',
  'follow for more',
  'tag someone who',
  'who else',
  'save this post',
  'save this for later',
  'drop a 🙌',
  "and i'll send you",
  "and i'll dm you",
  'comment below',
  'let me know in the comments',
  '♻️',
];

const LLM_VOCAB = [
  'delve',
  'tapestry',
  'testament to',
  'navigate the landscape',
  'navigate the complex',
  'game-changer',
  'game changer',
  "in today's fast-paced",
  'ever-evolving',
  'ever evolving',
  'at the end of the day',
  "it's worth noting",
  'unlock the power',
  'harness the power',
  'deep dive',
  'key takeaways',
  'in conclusion',
  'paradigm shift',
  'cutting-edge',
  'revolutionize',
  'transformative',
  'holistic approach',
  'seamless integration',
  'robust solution',
  'elevate your',
  'the future of work',
  'moving forward',
  'leveraging',
  'furthermore',
  'moreover',
];

const HUMILITY = [
  'humbled and honored',
  'humbled and honoured',
  'beyond grateful',
  'dream come true',
  "i don't usually post",
  'i rarely post',
  'i normally keep this private',
  'not bragging',
  "words can't describe",
  'grateful is an understatement',
  'still processing this',
  'little did i know',
  'blessed and grateful',
  'none of this would have been possible',
  'onwards and upwards',
  'the best is yet to come',
  'over the moon',
  'this one is for my',
];

const MORAL_MARKERS = [
  'the lesson',
  "here's what i learned",
  'what i learned',
  'the takeaway',
  'moral of the story',
  'what this taught me',
  'never forget',
  'remember this',
];

const GENERIC_HASHTAGS = new Set([
  'leadership',
  'innovation',
  'motivation',
  'mindset',
  'success',
  'growth',
  'ai',
  'productivity',
  'hiring',
  'networking',
  'inspiration',
  'entrepreneurship',
  'futureofwork',
  'personalbranding',
  'career',
  'business',
]);

/**
 * The rule catalogue.
 *
 * Weights are summed and then squashed by {@link ruleScore}. They live here in
 * one table so tuning is a single-file change; see tests/rules.test.ts for the
 * behaviour each weight is calibrated against.
 */
export const RULES: Rule[] = [
  {
    id: 'unicode-bold',
    category: 'ai',
    label: 'Fake bold text (unicode lookalike characters)',
    weight: 1.5,
    test: (ctx) => {
      if (!hasStyledUnicodeLetters(ctx.raw)) return null;
      const match =
        /[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF5A}]+(?:\s[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF5A}]+)*/u.exec(
          ctx.raw,
        );
      return snippet(match ? match[0] : 'styled unicode characters');
    },
  },
  {
    id: 'emoji-bullets',
    category: 'ai',
    label: 'Emoji-bulleted list',
    weight: 0.9,
    test: (ctx) => {
      const bulleted = ctx.lines.filter((line) => /^\p{Extended_Pictographic}/u.test(line));
      if (bulleted.length < 3) return null;
      return snippet(bulleted.slice(0, 2).join(' / '));
    },
  },
  {
    id: 'staccato-cadence',
    category: 'ai',
    label: 'One-line-per-thought cadence',
    weight: 0.8,
    test: (ctx) => {
      if (ctx.wordCount < MIN_WORDS_FOR_DENSITY || ctx.lines.length < 5) return null;
      const short = ctx.lines.filter((line) => countWords(line) <= 12);
      if (short.length / ctx.lines.length < 0.65) return null;
      return snippet(short.slice(0, 3).join(' ⏎ '));
    },
  },
  {
    id: 'antithesis-template',
    category: 'ai',
    label: '"It\'s not X. It\'s Y." construction',
    weight: 1.0,
    test: (ctx) =>
      firstMatch(ctx.lower, [
        /\bit'?s not (?:about )?[^.!?\n]{2,45}[.!?\n]\s*it'?s\b[^.!?\n]{0,45}/,
        /\b(?:isn'?t|aren'?t|wasn'?t|weren'?t|is not|are not|was not|were not) (?:just )?(?:about )?[^.!?\n]{2,45}[.!?\n—-]\s*(?:it'?s|they'?re|it is|they are)\b[^.!?\n]{0,45}/,
        /\bnot (?:just )?[a-z][^.!?\n]{2,35}\.\s*[a-z]{0,10}\s*but\b[^.!?\n]{0,45}/,
      ])?.trim() ?? null,
  },
  {
    id: 'formulaic-opener',
    category: 'ai',
    label: 'Formulaic hook phrase',
    weight: 0.7,
    test: (ctx) => {
      const hits = phraseHits(ctx.lower, OPENERS);
      return hits.length > 0 ? snippet(hits.join(', ')) : null;
    },
    scale: (ctx) => Math.min(2, phraseHits(ctx.lower, OPENERS).length),
  },
  {
    id: 'engagement-bait',
    category: 'ai',
    label: 'Engagement bait',
    weight: 0.8,
    test: (ctx) => {
      const hits = phraseHits(ctx.lower, BAIT);
      return hits.length > 0 ? snippet(hits.join(', ')) : null;
    },
    scale: (ctx) => Math.min(2, phraseHits(ctx.lower, BAIT).length),
  },
  {
    id: 'llm-vocabulary',
    category: 'ai',
    label: 'LLM-flavoured vocabulary',
    weight: 0.35,
    test: (ctx) => {
      const hits = phraseHits(ctx.lower, LLM_VOCAB);
      return hits.length > 0 ? snippet(hits.join(', ')) : null;
    },
    // Uncapped until 6 hits: one buzzword is a stylistic tic, a dozen is a
    // machine. This is the rule most likely to fire alone, so it needs the room
    // to reach the threshold on its own when the evidence is overwhelming.
    scale: (ctx) => Math.min(6, phraseHits(ctx.lower, LLM_VOCAB).length),
  },
  {
    id: 'em-dash-density',
    category: 'ai',
    label: 'Heavy em-dash use',
    weight: 0.7,
    test: (ctx) => {
      if (ctx.wordCount < MIN_WORDS_FOR_DENSITY) return null;
      const dashes = (ctx.text.match(/—/g) ?? []).length;
      if (dashes < 2 || (dashes / ctx.wordCount) * 100 < 1.5) return null;
      return `${dashes} em-dashes in ${ctx.wordCount} words`;
    },
  },
  {
    id: 'uniform-sentence-length',
    category: 'ai',
    label: 'Unnaturally even sentence lengths',
    weight: 0.5,
    test: (ctx) => {
      if (ctx.sentences.length < 6) return null;
      const lengths = ctx.sentences.map(countWords);
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      if (mean < 5 || mean > 18) return null;
      const sd = stddev(lengths);
      if (sd > 3) return null;
      return `${ctx.sentences.length} sentences averaging ${mean.toFixed(1)} words (σ ${sd.toFixed(1)})`;
    },
  },
  {
    id: 'hashtag-stuffing',
    category: 'ai',
    label: 'Hashtag stuffing',
    weight: 0.6,
    test: (ctx) => {
      const generic = ctx.hashtags.filter((tag) => GENERIC_HASHTAGS.has(tag));
      if (ctx.hashtags.length <= 5 && generic.length < 3) return null;
      return snippet(ctx.hashtags.map((tag) => `#${tag}`).join(' '));
    },
    // Ten interchangeable tags on a one-line platitude is a different act from
    // six specific ones on a real post, so the weight tracks both the count and
    // how generic the tags are.
    scale: (ctx) => {
      const generic = ctx.hashtags.filter((tag) => GENERIC_HASHTAGS.has(tag)).length;
      return Math.min(3, ctx.hashtags.length / 4 + (generic >= 3 ? 1 : 0));
    },
  },
  {
    id: 'announcement-opener',
    category: 'brag',
    label: 'Announcement humblebrag',
    weight: 0.9,
    test: (ctx) =>
      firstMatch(ctx.lower, [
        /\b(?:so |beyond |incredibly |truly )?(?:thrilled|humbled|honou?red|excited|delighted|proud|pumped|stoked)\b[^.!?\n]{0,50}\bto (?:announce|share|reveal|be named)\b[^.!?\n]{0,50}/,
        /\b(?:excited|proud) to (?:announce|share)\b[^.!?\n]{0,50}/,
      ])?.trim() ?? null,
  },
  {
    id: 'humility-flex',
    category: 'brag',
    label: 'Performative humility',
    weight: 1.0,
    test: (ctx) => {
      const hits = phraseHits(ctx.lower, HUMILITY);
      return hits.length > 0 ? snippet(hits.join(', ')) : null;
    },
    scale: (ctx) => Math.min(2, phraseHits(ctx.lower, HUMILITY).length),
  },
  {
    id: 'metric-flex',
    category: 'brag',
    label: 'Numbers flex',
    weight: 0.8,
    test: (ctx) =>
      firstMatch(ctx.lower, [
        /\b(?:i|we|my|our)\b[^.!?\n]{0,60}\$\s?\d[\d,.]*\s?(?:k|m|mm|b|million|billion)?\b/,
        /\b\d[\d,.]*\s?(?:k|m)?\+?\s*(?:followers|subscribers|users|customers|downloads|signups|arr|mrr)\b/,
        /\bfrom (?:0|zero)\b[^.!?\n]{0,30}\bto\b[^.!?\n]{0,30}\bin \d+\s*(?:days|weeks|months)\b/,
      ])?.trim() ?? null,
  },
  {
    id: 'parable',
    category: 'brag',
    label: 'Story-with-a-moral template',
    weight: 1.0,
    test: (ctx) => {
      if (ctx.wordCount < MIN_WORDS_FOR_DENSITY) return null;
      const halfway = Math.floor(ctx.text.length / 2);
      const hasDialogue = /["“][^"”\n]{5,}["”]/.test(ctx.text.slice(0, halfway));
      if (!hasDialogue) return null;
      const tail = ctx.lower.slice(Math.floor(ctx.lower.length * 0.6));
      const moral = phraseHits(tail, MORAL_MARKERS);
      if (moral.length === 0) return null;
      return snippet(`quoted dialogue, then "${moral[0] ?? ''}"`);
    },
  },
];

function buildContext(post: PostFeatures): RuleContext {
  const text = normalize(post.text);
  return {
    raw: post.text,
    text,
    lower: canonical(post.text),
    lines: post.lines,
    sentences: splitSentences(text),
    wordCount: countWords(text),
    hashtags: post.hashtags,
  };
}

/** Run the built-in catalogue plus any user keywords. Strongest signal first. */
export function runRules(post: PostFeatures, keywords: KeywordRule[] = []): Signal[] {
  const ctx = buildContext(post);
  const signals: Signal[] = [];

  for (const rule of RULES) {
    const evidence = rule.test(ctx);
    if (evidence === null) continue;
    const weight = rule.weight * (rule.scale ? rule.scale(ctx) : 1);
    if (weight <= 0) continue;
    signals.push({
      id: rule.id,
      category: rule.category,
      label: rule.label,
      weight,
      evidence,
    });
  }

  for (const keyword of keywords) {
    const term = keyword.term.trim().toLowerCase();
    if (term.length === 0 || !ctx.lower.includes(term)) continue;
    signals.push({
      id: `keyword:${term}`,
      category: keyword.category,
      label: 'Your keyword',
      weight: keyword.weight,
      evidence: term,
    });
  }

  return signals.sort((a, b) => b.weight - a.weight);
}

/**
 * Squash the summed rule weights into [0, 1).
 *
 * Saturating rather than linear: the tenth signal should not be able to push a
 * post further past the threshold than the first three already did, so a
 * long post never gets flagged purely for being long.
 */
export function ruleScore(signals: Signal[]): number {
  const sum = signals.reduce((acc, signal) => acc + signal.weight, 0);
  return 1 - Math.exp(-sum / 1.6);
}

/** Which flavour of slop dominates, by summed weight. */
export function dominantCategory(signals: Signal[]): SlopCategory {
  let ai = 0;
  let brag = 0;
  for (const signal of signals) {
    if (signal.category === 'ai') ai += signal.weight;
    else brag += signal.weight;
  }
  return brag > ai ? 'brag' : 'ai';
}
