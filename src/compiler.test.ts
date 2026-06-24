import { describe, expect, it } from 'vitest';

import { compile, isMatch, isPartialMatch, makeRe, parse, scan } from './index';

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

    // Globstar segment rule: degraded to star when sharing a segment
    expect(isMatch('foo-bar/baz', 'foo-**bar/baz')).toBe(true);
    expect(isMatch('foo-xyzbar/baz', 'foo-**bar/baz')).toBe(true);
    expect(isMatch('foo-x/y/bar/baz', 'foo-**bar/baz')).toBe(false);
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

describe('POSIX Character Classes', () => {
  it('should compile and match POSIX character classes inside brackets', () => {
    expect(isMatch('a', '[[:alpha:]]')).toBe(true);
    expect(isMatch('A', '[[:alpha:]]')).toBe(true);
    expect(isMatch('3', '[[:alpha:]]')).toBe(false);

    expect(isMatch('3', '[[:digit:]]')).toBe(true);
    expect(isMatch('a', '[[:digit:]]')).toBe(false);

    // Mixed POSIX class and literal characters
    expect(isMatch('a', '[[:digit:]abc]')).toBe(true);
    expect(isMatch('3', '[[:digit:]abc]')).toBe(true);
    expect(isMatch('x', '[[:digit:]abc]')).toBe(false);
  });
});

describe('V8-Safe Numeric Range Optimizer', () => {
  it('should optimize and compile numeric ranges into compact digit patterns', () => {
    const isMatched = compile('file-{1..250}.ts');
    expect(isMatched('file-1.ts')).toBe(true);
    expect(isMatched('file-99.ts')).toBe(true);
    expect(isMatched('file-250.ts')).toBe(true);
    expect(isMatched('file-251.ts')).toBe(false);
    expect(isMatched('file-0.ts')).toBe(false);
  });
});

describe('Partial Matching (isPartialMatch)', () => {
  it('should match prefix directories segment-by-segment for file watchers', () => {
    expect(isPartialMatch('src', 'src/**/*.ts')).toBe(true);
    expect(isPartialMatch('src/app', 'src/**/*.ts')).toBe(true);
    expect(isPartialMatch('src/app/components', 'src/**/*.ts')).toBe(true);
    expect(isPartialMatch('dist', 'src/**/*.ts')).toBe(false);
  });
});
