/**
 * Normalization Pre-Step for Spoken Meeting Audio & Transcripts
 * As specified in the Project Plan (Page 4):
 * "Spoken text doesn't look like written text: passwords get spelled out,
 * numbers become words, symbols get spoken ('dot', 'at', 'dash')."
 */

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '00',
  thousand: '000',
};

const SYMBOL_WORDS: Record<string, string> = {
  'exclamation mark': '!',
  exclamation: '!',
  'question mark': '?',
  question: '?',
  dot: '.',
  period: '.',
  at: '@',
  dash: '-',
  hyphen: '-',
  minus: '-',
  underscore: '_',
  slash: '/',
  backslash: '\\',
  colon: ':',
  semicolon: ';',
  hash: '#',
  pound: '#',
  percent: '%',
  dollar: '$',
  plus: '+',
  equals: '=',
  star: '*',
  asterisk: '*',
};

const FILLER_WORDS = new Set(['um', 'uh', 'er', 'ah', 'like', 'you know', 'sort of', 'kind of']);

export interface NormalizedTranscript {
  original: string;
  normalized: string;
  replacements: { from: string; to: string; index: number }[];
}

export function normalizeSpokenText(raw: string): NormalizedTranscript {
  let text = raw;
  const replacements: { from: string; to: string; index: number }[] = [];

  // 1. Spoken symbols with word boundaries
  // e.g., "john dot smith at gmail dot com" -> "john.smith@gmail.com"
  for (const [word, symbol] of Object.entries(SYMBOL_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(regex, (match, offset) => {
      replacements.push({ from: match, to: symbol, index: offset });
      return symbol;
    });
  }

  // 2. Fix spacing around symbols (e.g., "john . smith @ gmail . com" -> "john.smith@gmail.com")
  text = text.replace(/\s*([.@_\-\/])\s*/g, '$1');

  // 3. Spoken spelled-out characters e.g. "capital S, u, n, 2-0-2-4" -> "Sun2024"
  text = text.replace(/capital\s+([a-zA-Z])/gi, (_, char) => char.toUpperCase());

  // 4. Spoken single digits sequence "two zero two four" -> "2024"
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(regex, digit);
  }

  // 5. Clean comma-separated and space-separated single spelled letters and digits
  // Iteratively collapse single character / digit sequences (e.g. "2 0 2 6" -> "2026", "A K I A" -> "AKIA")
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\b([A-Za-z]),?\s+([A-Za-z])\b/g, '$1$2');
    text = text.replace(/\b(\d+)\s+(\d+)\b/g, '$1$2');
  }

  // 6. Strip filler words when surrounded by speech
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b[\\s,]*`, 'gi');
    text = text.replace(regex, '');
  }

  return {
    original: raw,
    normalized: text.trim(),
    replacements,
  };
}
