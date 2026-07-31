import { describe, expect, it } from 'vitest';
import { blendFactor, scorePost } from '../src/engine/score';
import { emptyModel } from '../src/engine/classifier';
import { DEFAULT_SETTINGS } from '../src/storage/schema';
import { FIXTURES } from './fixtures/posts';

const THRESHOLD = DEFAULT_SETTINGS.threshold;

function verdictFor(fixture: (typeof FIXTURES)[number]) {
  return scorePost(fixture.post, emptyModel(), { threshold: THRESHOLD });
}

describe('blendFactor', () => {
  it('is zero at cold start and capped at 0.7', () => {
    expect(blendFactor(0)).toBe(0);
    expect(blendFactor(100)).toBeCloseTo(0.7);
    expect(blendFactor(10_000)).toBe(0.7);
  });

  it('rises monotonically', () => {
    expect(blendFactor(50)).toBeGreaterThan(blendFactor(10));
  });
});

describe('cold-start accuracy on the fixture corpus', () => {
  it('flags every clear AI-slop post', () => {
    for (const fixture of FIXTURES.filter((f) => f.expected === 'ai' && !f.borderline)) {
      const verdict = verdictFor(fixture);
      expect(
        verdict.score,
        `${fixture.name} scored ${verdict.score.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(THRESHOLD);
      expect(verdict.label, fixture.name).toBe('ai');
    }
  });

  it('flags every clear bragging-slop post', () => {
    for (const fixture of FIXTURES.filter((f) => f.expected === 'brag' && !f.borderline)) {
      const verdict = verdictFor(fixture);
      expect(
        verdict.score,
        `${fixture.name} scored ${verdict.score.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(THRESHOLD);
      expect(verdict.label, fixture.name).toBe('brag');
    }
  });

  it('leaves every clear genuine post alone', () => {
    for (const fixture of FIXTURES.filter((f) => f.expected === 'clean' && !f.borderline)) {
      const verdict = verdictFor(fixture);
      expect(verdict.label, `${fixture.name} scored ${verdict.score.toFixed(2)}`).toBe('clean');
    }
  });

  it('keeps overall accuracy high including borderline cases', () => {
    const correct = FIXTURES.filter((f) => verdictFor(f).label === f.expected).length;
    expect(correct / FIXTURES.length).toBeGreaterThanOrEqual(0.85);
  });
});

describe('verdict shape', () => {
  it('reports no model score before any feedback', () => {
    const verdict = verdictFor(FIXTURES[0]!);
    expect(verdict.modelScore).toBeNull();
    expect(verdict.alpha).toBe(0);
    expect(verdict.score).toBeCloseTo(verdict.ruleScore);
  });

  it('sorts reasons strongest first', () => {
    const verdict = verdictFor(FIXTURES[0]!);
    const weights = verdict.reasons.map((r) => r.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it('blends in the model once it has been taught', () => {
    const model = emptyModel();
    model.labelCount = 100;
    const clean = FIXTURES.find((f) => f.expected === 'clean')!;
    const verdict = scorePost(clean.post, model, { threshold: THRESHOLD });
    expect(verdict.alpha).toBeCloseTo(0.7);
    expect(verdict.modelScore).not.toBeNull();
    // An untrained-but-counted model predicts 0.5, so the score moves toward it.
    expect(verdict.score).toBeGreaterThan(verdict.ruleScore);
  });

  it('honours user keywords', () => {
    const clean = FIXTURES.find((f) => f.expected === 'clean')!;
    const word = clean.post.text.split(' ')[0]!.toLowerCase();
    const verdict = scorePost(clean.post, emptyModel(), {
      threshold: THRESHOLD,
      keywords: [{ term: word, category: 'ai', weight: 3 }],
    });
    expect(verdict.label).not.toBe('clean');
  });
});
