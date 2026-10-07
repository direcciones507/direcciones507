import { describe, expect, test } from 'bun:test';
import { generatePlaceCodeCandidate } from './place-code';

describe('place code candidate generator', () => {
  test('normalizes accents and punctuation', () => {
    expect(generatePlaceCodeCandidate('Río Señoría & Café', 'a1b2c3')).toBe('AD507-RIO-SENORIA-CAFE-A1B2C3');
  });

  test('falls back safely when name has no usable characters', () => {
    expect(generatePlaceCodeCandidate('***', 'abcdef')).toBe('AD507-LUGAR-ABCDEF');
  });

  test('never emits spaces or unsafe URL characters', () => {
    const code = generatePlaceCodeCandidate('Parque / Central ? #1', '123abc');
    expect(code).toMatch(/^AD507-[A-Z0-9-]+$/);
    expect(code).not.toContain(' ');
  });
});
