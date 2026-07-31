import { describe, expect, it } from 'vitest';
import { dominantCategory, ruleScore, runRules } from '../src/engine/rules';
import { FIXTURES } from './fixtures/posts';
import { makePost } from './fixtures/posts';

/** Ids of the rules that fired, for concise assertions. */
function firedIds(text: string): string[] {
  return runRules(makePost(text)).map((signal) => signal.id);
}

describe('individual rules', () => {
  it('detects unicode lookalike bold', () => {
    expect(firedIds('𝗧𝗵𝗲 𝗯𝗲𝘀𝘁 𝗮𝗱𝘃𝗶𝗰𝗲 I ever got')).toContain('unicode-bold');
    expect(firedIds('The best advice I ever got')).not.toContain('unicode-bold');
  });

  it('requires three emoji bullets before firing', () => {
    const two = '🚀 One thing\n💡 Another thing\nA normal line';
    const three = '🚀 One thing\n💡 Another thing\n✅ A third thing';
    expect(firedIds(two)).not.toContain('emoji-bullets');
    expect(firedIds(three)).toContain('emoji-bullets');
  });

  it('detects the "it\'s not X, it\'s Y" construction', () => {
    expect(firedIds("This isn't about money. It's about freedom.")).toContain(
      'antithesis-template',
    );
  });

  it('does not fire the em-dash rule on short posts', () => {
    expect(firedIds('Short — but — punchy.')).not.toContain('em-dash-density');
  });

  it('fires the em-dash rule on long, dash-saturated text', () => {
    const text = `${'Leadership — real leadership — is about attention and care. '.repeat(4)}It requires patience — and humility — every single day of the week for everyone.`;
    expect(firedIds(text)).toContain('em-dash-density');
  });

  it('treats more than five hashtags as stuffing', () => {
    const five = 'Nice day #a1 #b2 #c3 #d4 #e5';
    const six = 'Nice day #a1 #b2 #c3 #d4 #e5 #f6';
    expect(firedIds(five)).not.toContain('hashtag-stuffing');
    expect(firedIds(six)).toContain('hashtag-stuffing');
  });

  it('detects announcement humblebrags', () => {
    expect(firedIds('Thrilled to announce that I have joined Acme as CTO!')).toContain(
      'announcement-opener',
    );
  });

  it('does not fire on a plain factual statement', () => {
    expect(firedIds('We shipped the billing migration last night.')).toEqual([]);
  });
});

describe('user keywords', () => {
  it('adds a signal for a matching keyword', () => {
    const signals = runRules(makePost('Our synergy is unmatched'), [
      { term: 'synergy', category: 'ai', weight: 1.2 },
    ]);
    expect(signals.map((s) => s.id)).toContain('keyword:synergy');
  });

  it('ignores blank keywords', () => {
    const signals = runRules(makePost('Anything at all'), [
      { term: '   ', category: 'ai', weight: 1 },
    ]);
    expect(signals).toEqual([]);
  });
});

describe('ruleScore', () => {
  it('returns 0 with no signals and saturates below 1', () => {
    expect(ruleScore([])).toBe(0);
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`,
      category: 'ai' as const,
      label: 'x',
      weight: 1,
      evidence: 'x',
    }));
    expect(ruleScore(many)).toBeLessThan(1);
    expect(ruleScore(many)).toBeGreaterThan(0.99);
  });

  it('is monotonic in the summed weight', () => {
    const one = [{ id: 'a', category: 'ai' as const, label: 'x', weight: 1, evidence: 'x' }];
    const two = [
      ...one,
      { id: 'b', category: 'ai' as const, label: 'x', weight: 1, evidence: 'x' },
    ];
    expect(ruleScore(two)).toBeGreaterThan(ruleScore(one));
  });
});

describe('dominantCategory', () => {
  it('picks the heavier category', () => {
    expect(
      dominantCategory([
        { id: 'a', category: 'ai', label: 'x', weight: 1, evidence: 'x' },
        { id: 'b', category: 'brag', label: 'x', weight: 2, evidence: 'x' },
      ]),
    ).toBe('brag');
  });
});

describe('evidence', () => {
  it('always returns a non-empty evidence string for every fired signal', () => {
    for (const fixture of FIXTURES) {
      for (const signal of runRules(fixture.post)) {
        expect(signal.evidence.length, `${fixture.name}/${signal.id}`).toBeGreaterThan(0);
        expect(signal.weight).toBeGreaterThan(0);
      }
    }
  });
});
