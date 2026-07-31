/**
 * Text normalization and tokenization shared by the rules and the classifier.
 *
 * Everything here is pure and synchronous — it runs once per post on the main
 * thread, so it stays allocation-light and avoids catastrophic backtracking.
 */

/**
 * Unicode Mathematical Alphanumeric Symbols plus the enclosed/fullwidth blocks.
 *
 * LinkedIn strips real formatting, so "𝗹𝗼𝗼𝗸 𝗮𝘁 𝗺𝗲" bold text is written with
 * these lookalike codepoints. Nobody types them by hand; they come from a
 * "LinkedIn text formatter" tool, which is a strong slop tell.
 */
const STYLED_LETTERS = /[\u{1D400}-\u{1D7FF}\u{FF21}-\u{FF3A}\u{FF41}-\u{FF5A}]/u;

/** True when the raw text uses lookalike-bold/italic characters. */
export function hasStyledUnicodeLetters(raw: string): boolean {
  return STYLED_LETTERS.test(raw);
}

/**
 * Fold lookalike characters back to ASCII so downstream matching works.
 *
 * NFKC maps the entire Mathematical Alphanumeric Symbols block onto plain
 * letters, which is why the rules can be written against normal English.
 */
export function normalize(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ');
}

/** Lowercased, punctuation-light form used for keyword and n-gram matching. */
export function canonical(raw: string): string {
  return normalize(raw).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/** Non-empty, trimmed lines. */
export function splitLines(text: string): string[] {
  return normalize(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Split into sentences.
 *
 * Slop posts routinely use a bare newline as terminal punctuation, so a line
 * break ends a sentence here even without a period.
 */
export function splitSentences(text: string): string[] {
  return normalize(text)
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Word count, ignoring punctuation-only runs. */
export function countWords(text: string): number {
  const matches = normalize(text).match(/[\p{L}\p{N}'-]+/gu);
  return matches ? matches.length : 0;
}

/** Individual word tokens, lowercased. */
export function words(text: string): string[] {
  return canonical(text).match(/[\p{L}\p{N}']+/gu) ?? [];
}

/**
 * Bag-of-features for the classifier: unigrams and bigrams, each capped at 1.
 *
 * Capping (presence rather than count) keeps a single repeated buzzword from
 * dominating the gradient on a short post.
 */
export function featurize(text: string): Record<string, number> {
  const toks = words(text);
  const features: Record<string, number> = {};
  for (let i = 0; i < toks.length; i += 1) {
    const unigram = toks[i];
    if (unigram === undefined || unigram.length < 2) continue;
    features[`w:${unigram}`] = 1;
    const next = toks[i + 1];
    if (next !== undefined) features[`b:${unigram} ${next}`] = 1;
  }
  return features;
}

/** Hashtags without the leading `#`, lowercased and de-duplicated. */
export function extractHashtags(text: string): string[] {
  const matches = normalize(text).match(/#[\p{L}\p{N}_]{2,}/gu) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

/** Population standard deviation. Returns 0 for fewer than two samples. */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
