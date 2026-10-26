// Makes official NWS text easier to scan WITHOUT rewriting it: unwraps the 70-column
// line breaks, splits instructions into sentences, and splits descriptions into their
// own "* WHAT... * WHERE... * WHEN... * IMPACTS..." sections. Every word stays official.

/** Joins hard-wrapped lines, keeping "- " bullet lines on their own line. */
export function unwrap(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n(?!\s*-\s)(?!\n)/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Instruction text → list of sentences, in order, verbatim. */
export function splitInstructions(instruction) {
  if (!instruction) return [];
  return String(instruction)
    .split(/\n\s*\n/)
    .map(unwrap)
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=["'(]?[A-Z0-9])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const LABELS = { WHAT: 'What', WHERE: 'Where', WHEN: 'When', IMPACTS: 'Impacts', 'ADDITIONAL DETAILS': 'Additional details', 'PRECAUTIONARY/PREPAREDNESS ACTIONS': 'Precautions' };

/**
 * NWS "* WHAT...x\n\n* WHERE...y" or Environment Canada "What: x\n\nWhen: y" →
 * [{ label: 'What', text: 'x' }, …]; null when the text has neither format.
 */
export function parseDescription(description) {
  const text = String(description || '');
  const nws = /^\*\s*([A-Z][A-Z /]+?)\.\.\.([\s\S]*?)(?=^\*\s*[A-Z][A-Z /]+?\.\.\.|(?![\s\S]))/gm;
  const eccc = /^(What|When|Where|Impacts?|Additional information|Remarks):[ \t]*([\s\S]*?)(?=^(?:What|When|Where|Impacts?|Additional information|Remarks):|(?![\s\S]))/gm;
  for (const re of [nws, eccc]) {
    const sections = [];
    let m;
    while ((m = re.exec(text))) {
      const key = m[1].trim().toUpperCase();
      sections.push({ label: LABELS[key] ?? key.charAt(0) + key.slice(1).toLowerCase(), text: unwrap(m[2]) });
    }
    if (sections.length) return sections;
  }
  return null;
}
