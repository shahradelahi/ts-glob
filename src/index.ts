import { ASTNode, GlobError, GlobLimitError, Lexer, Parser } from '@se-oss/glob-parser';

import { REGEX_CACHE, SCAN_CACHE } from './cache';
import { Compiler } from './compiler';
import { GlobOptions, MatcherFunction, ScanResult } from './typings';
import { getCacheKey } from './utils';

export { GlobError, GlobLimitError, GlobSyntaxError } from '@se-oss/glob-parser';
export { clearCache } from './cache';
export * from './typings';

export type SafeParseResult =
  | { success: true; data: ASTNode }
  | { success: false; error: GlobError };

function validatePattern(pattern: any, options: GlobOptions = {}): void {
  if (typeof pattern !== 'string') {
    throw new TypeError(`Expected a string glob pattern, got ${typeof pattern}`);
  }
  const maxLen = options.maxLength ?? 65536;
  if (pattern.length > maxLen) {
    throw new GlobLimitError('Glob pattern exceeds maximum allowed length.');
  }
}

/**
 * Compile glob to RegExp.
 *
 * @example
 * makeRe('src/*.ts') // => /^src\/[^/]*\.ts$/
 */
export function makeRe(pattern: string, options: GlobOptions = {}): RegExp {
  validatePattern(pattern, options);

  let cacheKey = '';
  const useCache = !options.nocache;

  if (useCache) {
    cacheKey = getCacheKey(pattern, options);
    const cached = REGEX_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const tokens = new Lexer(pattern, options).tokenize();
  const ast = new Parser(tokens, options, pattern).parse();
  const regex = new Compiler(options).compile(ast);

  if (useCache) {
    REGEX_CACHE.set(cacheKey, regex);
  }

  return regex;
}

function isDefinitelyStatic(pattern: string): boolean {
  return !/[*?{([!]/.test(pattern);
}

function basename(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlash === -1) return path;
  return path.slice(lastSlash + 1);
}

function getTestInput(input: string, pattern: string, options: GlobOptions): string {
  const normalized = options.windows !== false ? input.replace(/\\/g, '/') : input;
  return options.basename && !pattern.includes('/') ? basename(normalized) : normalized;
}

/**
 * Compile glob to matcher function.
 *
 * @example
 * const match = compile('src/*.ts');
 * match('src/index.ts') // => true
 */
export function compile(pattern: string, options: GlobOptions = {}): MatcherFunction {
  if (isDefinitelyStatic(pattern)) {
    const target = options.windows !== false ? pattern.replace(/\\/g, '/') : pattern;
    if (options.nocase) {
      const lowerTarget = target.toLowerCase();
      return (input: string) => getTestInput(input, pattern, options).toLowerCase() === lowerTarget;
    }
    return (input: string) => getTestInput(input, pattern, options) === target;
  }

  const regex = makeRe(pattern, options);
  return (input: string) => regex.test(getTestInput(input, pattern, options));
}

/**
 * Check if path matches pattern or list of patterns.
 *
 * @example
 * isMatch('src/index.ts', 'src/*.ts') // => true
 * isMatch('src/index.ts', ['src/*.ts', '!src/index.ts']) // => false
 */
export function isMatch(
  input: string,
  pattern: string | string[],
  options: GlobOptions = {}
): boolean {
  if (typeof input !== 'string') {
    throw new TypeError(`Expected a string input, got ${typeof input}`);
  }
  if (!Array.isArray(pattern) && typeof pattern !== 'string') {
    throw new TypeError(`Expected a string or array of strings for pattern, got ${typeof pattern}`);
  }
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  let match = false;

  for (const pat of patterns) {
    const isNegated = pat.startsWith('!');
    if (isNegated) {
      const isDoubleNegated = pat.startsWith('!!');
      if (isDoubleNegated) {
        const actualPattern = pat.slice(2);
        const matcher = compile(actualPattern, options);
        if (matcher(input)) {
          match = true;
        }
      } else {
        const actualPattern = pat.slice(1);
        const matcher = compile(actualPattern, options);
        if (matcher(input)) {
          match = false;
        }
      }
    } else {
      const matcher = compile(pat, options);
      if (matcher(input)) {
        match = true;
      }
    }
  }

  return match;
}

/**
 * Parse glob to AST.
 *
 * @example
 * parse('src/*.ts') // => ASTNode
 */
export function parse(pattern: string, options: GlobOptions = {}): ASTNode {
  validatePattern(pattern, options);
  const tokens = new Lexer(pattern, options).tokenize();
  return new Parser(tokens, options, pattern).parse();
}

/**
 * Safely parse glob to AST. Returns discriminated union.
 *
 * @example
 * safeParse('src/[a-z') // => { success: false, error: GlobSyntaxError }
 */
export function safeParse(pattern: string, options: GlobOptions = {}): SafeParseResult {
  try {
    const ast = parse(pattern, options);
    return { success: true, data: ast };
  } catch (err) {
    if (err instanceof GlobError) {
      return { success: false, error: err };
    }
    // Convert generic errors (e.g. TypeError) to GlobError if needed, or rethrow.
    // To match the user-friendly API, returning it wrapped as GlobError or just as is:
    return { success: false, error: err as GlobError };
  }
}

/**
 * Extract static base path and dynamic status.
 *
 * @example
 * scan('src/*.ts') // => { base: 'src', isDynamic: true, pattern: 'src/*.ts' }
 */
export function scan(pattern: string, options: GlobOptions = {}): ScanResult {
  validatePattern(pattern, options);

  let cacheKey = '';
  const useCache = !options.nocache;

  if (useCache) {
    cacheKey = getCacheKey(pattern, options);
    const cached = SCAN_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const tokens = new Lexer(pattern, options).tokenize();
  let isDynamic = false;

  const segments: string[] = [];
  let currentSegment = '';
  let segmentIsDynamic = false;

  for (const tok of tokens) {
    if (tok.type === 'SLASH') {
      if (segmentIsDynamic) {
        isDynamic = true;
      }
      if (!isDynamic) {
        segments.push(currentSegment);
      }
      currentSegment = '';
      segmentIsDynamic = false;
    } else {
      if (
        tok.type === 'STAR' ||
        tok.type === 'GLOBSTAR' ||
        tok.type === 'QUESTION' ||
        tok.type === 'BRACE_OPEN' ||
        tok.type === 'BRACKET_OPEN' ||
        tok.type === 'EXTGLOB_OPEN'
      ) {
        segmentIsDynamic = true;
        isDynamic = true;
      }
      currentSegment += tok.value;
    }
  }

  if (segmentIsDynamic) {
    isDynamic = true;
  }
  if (!isDynamic) {
    segments.push(currentSegment);
  }

  const base = segments.join('/');
  const result = { base, isDynamic, pattern };

  if (useCache) {
    SCAN_CACHE.set(cacheKey, result);
  }

  return result;
}

/**
 * Check if directory path partially matches pattern. Useful for watchers.
 *
 * @example
 * isPartialMatch('src', 'src/*.ts') // => true
 */
export function isPartialMatch(path: string, pattern: string, options: GlobOptions = {}): boolean {
  if (typeof path !== 'string') {
    throw new TypeError(`Expected a string path, got ${typeof path}`);
  }
  validatePattern(pattern, options);
  const normalizedPath = options.windows !== false ? path.replace(/\\/g, '/') : path;
  const pathSegments = normalizedPath.split('/').filter(Boolean);

  const tokens = new Lexer(pattern, options).tokenize();
  const ast = new Parser(tokens, options, pattern).parse();

  if (ast.type !== 'Root' || !ast.children) return false;

  // Split ast children into segments
  const patternSegments: ASTNode[][] = [];
  let current: ASTNode[] = [];
  for (const node of ast.children) {
    if (node.type === 'Slash') {
      patternSegments.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  patternSegments.push(current);

  const filteredPatternSegments = patternSegments.filter((seg) => seg.length > 0);

  let pathIdx = 0;
  let patIdx = 0;

  while (pathIdx < pathSegments.length && patIdx < filteredPatternSegments.length) {
    const pathSeg = pathSegments[pathIdx]!;
    const patSeg = filteredPatternSegments[patIdx]!;

    const isGlobstar = patSeg.length === 1 && patSeg[0]!.type === 'Globstar';
    if (isGlobstar) {
      if (patIdx === filteredPatternSegments.length - 1) {
        return true;
      }
      return true;
    }

    const compiler = new Compiler(options);
    const tempNode: ASTNode = {
      type: 'Root',
      value: '',
      children: patSeg,
    };
    const regex = compiler.compile(tempNode);
    if (!regex.test(pathSeg)) {
      return false;
    }

    pathIdx++;
    patIdx++;
  }

  return true;
}
