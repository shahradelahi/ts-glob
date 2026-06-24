import { GlobOptions } from './typings';

export function getCacheKey(pattern: string, options: GlobOptions): string {
  const keys = Object.keys(options).sort() as (keyof GlobOptions)[];
  let optionsStr = '';
  for (const k of keys) {
    const val = options[k];
    if (val !== undefined) {
      optionsStr += `${k}:${val};`;
    }
  }
  return `${pattern}|${optionsStr}`;
}

export function escapeRegex(str: string): string {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export function escapeRegexClass(str: string): string {
  // Escapes \, ], -, and ^ which have special meanings inside regex bracket classes [...]
  return str.replace(/[\\\]\-^]/g, '\\$&');
}

const POSIX_CLASSES: Record<string, string> = {
  '[:alnum:]': 'a-zA-Z0-9',
  '[:alpha:]': 'a-zA-Z',
  '[:digit:]': '0-9',
  '[:space:]': '\\s',
  '[:word:]': 'a-zA-Z0-9_',
  '[:punct:]': '!"#$%&\'()*+,\\-./:;<=>?@[\\]^_`{|}~',
};

export function compileBracketValue(val: string): string {
  const regex = /\[:[a-z]+:\]/g;
  let lastIndex = 0;
  let result = '';
  let match;

  while ((match = regex.exec(val)) !== null) {
    const index = match.index;
    const before = val.slice(lastIndex, index);
    result += escapeRegexClass(before);

    const posixClass = match[0]!;
    const translated = POSIX_CLASSES[posixClass] ?? posixClass;
    result += translated;

    lastIndex = regex.lastIndex;
  }

  const remaining = val.slice(lastIndex);
  result += escapeRegexClass(remaining);

  return result;
}
