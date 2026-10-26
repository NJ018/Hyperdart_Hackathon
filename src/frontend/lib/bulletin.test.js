import { describe, expect, it } from 'vitest';
import { parseDescription, splitInstructions, unwrap } from './bulletin.js';
import { nws } from './testFixtures.js';

const colorado = nws('state-colorado').body.features[0].properties;
const miami = nws('city-miami').body.features[0].properties;

describe('bulletin text helpers', () => {
  it('splits instructions into verbatim sentences', () => {
    expect(splitInstructions(colorado.instruction)).toEqual([
      "Turn around, don't drown when encountering flooded roads.",
      'Most flood deaths occur in vehicles.',
      'Be aware of your surroundings and do not drive on flooded roads.',
    ]);
    expect(splitInstructions(null)).toEqual([]);
  });

  it('never changes the words, only whitespace', () => {
    const squash = (s) => s.replace(/\s+/g, '');
    expect(squash(splitInstructions(miami.instruction).join(''))).toBe(squash(miami.instruction));
  });

  it('splits a description into its WHAT / WHERE / WHEN / IMPACTS sections', () => {
    const s = parseDescription(colorado.description);
    expect(s.map((x) => x.label)).toEqual(['What', 'Where', 'When', 'Impacts', 'Additional details']);
    expect(s[0].text).toBe('Flooding caused by excessive rainfall is expected.');
    expect(s[2].text).toBe('Until 1245 AM MDT Tuesday.');
    expect(s[4].text).toContain('\n- Widespread inundation');
  });

  it('returns null for free-form descriptions', () => {
    expect(parseDescription('The National Weather Service has issued a statement.')).toBeNull();
  });

  it('unwraps 70-column lines', () => {
    expect(unwrap('Flooding of rivers, creeks\nand streams.')).toBe('Flooding of rivers, creeks and streams.');
  });
});
