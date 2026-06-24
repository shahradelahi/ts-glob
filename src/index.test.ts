import { describe, expect, it } from 'vitest';

import { clearCache, compile, isMatch, makeRe, parse, scan } from './index';

describe('Compiler & Matching', () => {
  it('should compile and match basic patterns', () => {
    expect(isMatch('foo/bar', 'foo/bar')).toBe(true);
    expect(isMatch('foo/baz', 'foo/bar')).toBe(false);
  });

  it('should compile and match single star wildcard', () => {
    expect(isMatch('foo/bar.ts', 'foo/*.ts')).toBe(true);
    expect(isMatch('foo/bar/baz.ts', 'foo/*.ts')).toBe(false);
  });

  it('should compile and match globstars (**)', () => {
    expect(isMatch('foo/bar.ts', 'foo/**/*.ts')).toBe(true);
    expect(isMatch('foo/a/b/bar.ts', 'foo/**/*.ts')).toBe(true);
    expect(isMatch('foo/a/b/c/d/bar.ts', 'foo/**/*.ts')).toBe(true);
    expect(isMatch('foo/bar.js', 'foo/**/*.ts')).toBe(false);
  });

  it('should support dot option for hidden files', () => {
    expect(isMatch('foo/.bar.ts', 'foo/**/*.ts')).toBe(false);
    expect(isMatch('foo/.bar.ts', 'foo/**/*.ts', { dot: true })).toBe(true);
  });

  it('should compile and match range braces', () => {
    expect(isMatch('foo/file-1.ts', 'foo/file-{1..3}.ts')).toBe(true);
    expect(isMatch('foo/file-2.ts', 'foo/file-{1..3}.ts')).toBe(true);
    expect(isMatch('foo/file-3.ts', 'foo/file-{1..3}.ts')).toBe(true);
    expect(isMatch('foo/file-4.ts', 'foo/file-{1..3}.ts')).toBe(false);
  });

  it('should compile and match list braces', () => {
    expect(isMatch('foo/a.ts', 'foo/{a,b}.ts')).toBe(true);
    expect(isMatch('foo/b.ts', 'foo/{a,b}.ts')).toBe(true);
    expect(isMatch('foo/c.ts', 'foo/{a,b}.ts')).toBe(false);
  });

  it('should compile and match extglobs', () => {
    // ! (negated) extglob
    expect(isMatch('foo/baz.ts', 'foo/!(foo|bar).ts')).toBe(true);
    expect(isMatch('foo/foo.ts', 'foo/!(foo|bar).ts')).toBe(false);
    expect(isMatch('foo/bar.ts', 'foo/!(foo|bar).ts')).toBe(false);

    // @ (exact choice) extglob
    expect(isMatch('foo/foo.ts', 'foo/@(foo|bar).ts')).toBe(true);
    expect(isMatch('foo/baz.ts', 'foo/@(foo|bar).ts')).toBe(false);

    // ? (zero or one) extglob
    expect(isMatch('foo/.ts', 'foo/?(foo|bar).ts')).toBe(false); // dotfile starts with a dot, should be false when dot option is false
    expect(isMatch('foo/foo.ts', 'foo/?(foo|bar).ts')).toBe(true);
    expect(isMatch('foo/foobar.ts', 'foo/?(foo|bar).ts')).toBe(false);
  });

  it('should support case-insensitive option', () => {
    expect(isMatch('FOO/BAR', 'foo/bar')).toBe(false);
    expect(isMatch('FOO/BAR', 'foo/bar', { nocase: true })).toBe(true);
  });

  it('should support list array patterns and negation order', () => {
    expect(isMatch('foo/a.ts', ['foo/**/*.ts', '!foo/b.ts'])).toBe(true);
    expect(isMatch('foo/b.ts', ['foo/**/*.ts', '!foo/b.ts'])).toBe(false);
    expect(isMatch('foo/b.ts', ['foo/**/*.ts', '!foo/b.ts', '!!foo/b.ts'])).toBe(true);
  });

  it('should support automatic Windows path normalization in matching', () => {
    // defaults to true (normalizes windows paths)
    expect(isMatch('foo\\bar\\baz.ts', 'foo/**/*.ts')).toBe(true);
    expect(compile('foo/**/*.ts')('foo\\bar\\baz.ts')).toBe(true);

    // can disable normalization with windows: false
    expect(isMatch('foo\\bar\\baz.ts', 'foo/**/*.ts', { windows: false })).toBe(false);
    expect(compile('foo/**/*.ts', { windows: false })('foo\\bar\\baz.ts')).toBe(false);
  });

  it('should optimize static patterns using static fast-path', () => {
    // Basic static match
    const match1 = compile('foo/bar');
    expect(match1('foo/bar')).toBe(true);
    expect(match1('foo/baz')).toBe(false);

    // Case-insensitive static match
    const match2 = compile('foo/bar', { nocase: true });
    expect(match2('FOO/BAR')).toBe(true);
    expect(match2('FOO/BAZ')).toBe(false);

    // Windows normalization static match
    const match3 = compile('foo/bar');
    expect(match3('foo\\bar')).toBe(true);

    const match4 = compile('foo/bar', { windows: false });
    expect(match4('foo\\bar')).toBe(false);
  });

  it('should support basename option', () => {
    // When basename is true, patterns without slashes should match file basenames
    expect(isMatch('foo/bar/baz.js', '*.js', { basename: true })).toBe(true);
    expect(isMatch('foo/bar/baz.js', 'baz.js', { basename: true })).toBe(true);
    expect(isMatch('foo/bar/baz.js', 'bar.js', { basename: true })).toBe(false);

    // If pattern contains a slash, basename option has no effect
    expect(isMatch('bar/baz.js', 'bar/*.js', { basename: true })).toBe(true);
    expect(isMatch('foo/bar/baz.js', 'foo/*.js', { basename: true })).toBe(false);
  });
});

describe('High-Level APIs', () => {
  it('should compile regex using makeRe', () => {
    const regex = makeRe('foo/*.ts');
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test('foo/bar.ts')).toBe(true);
    expect(regex.test('foo/bar/baz.ts')).toBe(false);
  });

  it('should compile matcher using compile', () => {
    const isTs = compile('foo/*.ts');
    expect(isTs('foo/bar.ts')).toBe(true);
    expect(isTs('foo/bar/baz.ts')).toBe(false);
  });

  it('should parse pattern into AST using parse', () => {
    const ast = parse('foo/bar');
    expect(ast.type).toBe('Root');
    expect(ast.children).toBeDefined();
  });
});

describe('scan', () => {
  it('should correctly scan static base and dynamic status', () => {
    expect(scan('foo/bar/*.js')).toEqual({
      base: 'foo/bar',
      isDynamic: true,
      pattern: 'foo/bar/*.js',
    });

    expect(scan('src/**/*.test.ts')).toEqual({
      base: 'src',
      isDynamic: true,
      pattern: 'src/**/*.test.ts',
    });

    expect(scan('src/components/button.tsx')).toEqual({
      base: 'src/components/button.tsx',
      isDynamic: false,
      pattern: 'src/components/button.tsx',
    });
  });
});

describe('Compilation Cache', () => {
  it('should return the identical RegExp reference when cache hits', () => {
    clearCache();
    const r1 = makeRe('foo/*.ts');
    const r2 = makeRe('foo/*.ts');
    expect(r1).toBe(r2); // exact same object reference!
  });

  it('should return a new RegExp reference when nocache is true', () => {
    clearCache();
    const r1 = makeRe('foo/*.ts', { nocache: true });
    const r2 = makeRe('foo/*.ts', { nocache: true });
    expect(r1).not.toBe(r2);
  });

  it('should clear the cache on clearCache', () => {
    clearCache();
    const r1 = makeRe('foo/*.ts');
    clearCache();
    const r2 = makeRe('foo/*.ts');
    expect(r1).not.toBe(r2);
  });

  it('should handle option changes correctly with different cache entries', () => {
    clearCache();
    const r1 = makeRe('foo/*.ts', { nocase: true });
    const r2 = makeRe('foo/*.ts', { nocase: false });
    expect(r1).not.toBe(r2);
  });
});
