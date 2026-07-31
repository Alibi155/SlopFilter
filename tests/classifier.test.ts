import { describe, expect, it } from 'vitest';
import {
  buildFeatures,
  emptyModel,
  MODEL_VERSION,
  predict,
  retrain,
  train,
} from '../src/engine/classifier';
import { scorePost } from '../src/engine/score';
import { runRules } from '../src/engine/rules';
import type { FeedbackEntry } from '../src/engine/types';
import { CLEAN_FIXTURES, makePost } from './fixtures/posts';

describe('emptyModel', () => {
  it('predicts 0.5 for anything', () => {
    expect(predict(emptyModel(), { 'w:hello': 1 })).toBeCloseTo(0.5);
  });

  it('carries the schema version', () => {
    expect(emptyModel().version).toBe(MODEL_VERSION);
  });
});

describe('buildFeatures', () => {
  it('includes word, bigram and rule features', () => {
    const post = makePost('Thrilled to announce my new role');
    const features = buildFeatures(post.text, runRules(post));
    expect(features['w:thrilled']).toBe(1);
    expect(features['b:thrilled to']).toBe(1);
    expect(features['r:announcement-opener']).toBe(1);
  });
});

describe('train', () => {
  it('moves the prediction toward the label', () => {
    const model = emptyModel();
    const features = { 'w:synergy': 1 };
    const before = predict(model, features);
    train(model, features, 1);
    expect(predict(model, features)).toBeGreaterThan(before);
  });

  it('separates two classes after repeated exposure', () => {
    const model = emptyModel();
    for (let i = 0; i < 40; i += 1) {
      train(model, { 'w:synergy': 1, 'r:llm-vocabulary': 1 }, 1);
      train(model, { 'w:postgres': 1 }, 0);
    }
    expect(predict(model, { 'w:synergy': 1, 'r:llm-vocabulary': 1 })).toBeGreaterThan(0.8);
    expect(predict(model, { 'w:postgres': 1 })).toBeLessThan(0.2);
  });

  it('counts labels only when asked', () => {
    const model = emptyModel();
    train(model, { a: 1 }, 1);
    expect(model.labelCount).toBe(1);
    train(model, { a: 1 }, 1, false);
    expect(model.labelCount).toBe(1);
  });

  it('prunes weights that decay to noise', () => {
    const model = emptyModel();
    // A feature seen once with a label matching the current prediction barely
    // moves, and must not be stored forever.
    train(model, { 'w:neutral': 0 }, 1);
    expect(Object.keys(model.weights)).not.toContain('w:neutral');
  });
});

describe('retrain', () => {
  function entry(urn: string, label: 0 | 1, text: string, signals: string[] = []): FeedbackEntry {
    return { urn, label, text, signals, at: Number(urn) };
  }

  it('is deterministic for the same log', () => {
    const log = [
      entry('1', 1, 'slop slop slop'),
      entry('2', 0, 'real postgres migration'),
      entry('3', 1, 'slop bait slop bait'),
    ];
    expect(retrain(log)).toEqual(retrain([...log].reverse()));
  });

  it('reports labelCount as the log size', () => {
    expect(retrain([entry('1', 1, 'alpha alpha'), entry('2', 0, 'beta beta')]).labelCount).toBe(2);
  });

  it('produces a model that classifies its training data', () => {
    const model = retrain([
      entry('1', 1, 'synergy synergy'),
      entry('2', 1, 'synergy leverage'),
      entry('3', 0, 'postgres postgres'),
      entry('4', 0, 'postgres migration'),
    ]);
    expect(predict(model, { 'w:synergy': 1 })).toBeGreaterThan(0.6);
    expect(predict(model, { 'w:postgres': 1 })).toBeLessThan(0.4);
  });

  it('handles an empty log', () => {
    expect(retrain([]).labelCount).toBe(0);
  });
});

describe('feedback changes future verdicts', () => {
  it('teaching that a rule is wrong lowers scores for posts that trip it', () => {
    // A user who does not mind announcement posts labels a run of them "not slop".
    const announcement = makePost(
      'Thrilled to announce that I have joined Acme as a staff engineer. Excited to share more soon.',
    );
    const signals = runRules(announcement);
    const features = buildFeatures(announcement.text, signals);

    const model = emptyModel();
    for (let i = 0; i < 100; i += 1) train(model, features, 0);

    const before = scorePost(announcement, emptyModel(), { threshold: 0.6 });
    const after = scorePost(announcement, model, { threshold: 0.6 });
    expect(after.score).toBeLessThan(before.score);
    expect(after.alpha).toBeCloseTo(0.7);
  });

  it('never lets the model alone flag a post the rules found spotless', () => {
    // Even a maximally hostile model is capped at alpha, so a clean post cannot
    // exceed 0.7 on model opinion alone.
    const model = emptyModel();
    model.labelCount = 1000;
    model.bias = 50;
    for (const fixture of CLEAN_FIXTURES) {
      const verdict = scorePost(fixture.post, model, { threshold: 0.75 });
      expect(verdict.label, fixture.name).toBe('clean');
    }
  });
});
