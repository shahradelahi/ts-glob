import { describe, expect, it } from 'vitest';

import { GlobLimitError, GlobSyntaxError, makeRe, parse, safeParse } from './index';

describe('Compiler-Grade Error Handling', () => {
  describe('Custom Error Classes & Visual Reporting', () => {
    it('should throw GlobSyntaxError with a visual pointer', () => {
      try {
        parse('src/components/[a-z/*.ts', { strict: true });
        expect.fail('Should have thrown GlobSyntaxError');
      } catch (err) {
        expect(err).toBeInstanceOf(GlobSyntaxError);
        const syntaxErr = err as GlobSyntaxError;
        expect(syntaxErr.index).toBe(15);
        expect(syntaxErr.pattern).toBe('src/components/[a-z/*.ts');
        expect(syntaxErr.message).toContain('Unclosed bracket "[" at position 15');
        expect(syntaxErr.message).toContain('  > 1 | src/components/[a-z/*.ts');
        expect(syntaxErr.message).toContain('      |                ^');
      }
    });
  });

  describe('Zod-Style safeParse API', () => {
    it('should return success and AST for a valid glob', () => {
      const result = safeParse('src/**/*.ts');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('Root');
      }
    });

    it('should return success false and the error for an invalid glob', () => {
      const result = safeParse('src/components/[a-z/*.ts', { strict: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GlobSyntaxError);
        expect((result.error as GlobSyntaxError).index).toBe(15);
      }
    });
  });

  describe('Defensive Limits (GlobLimitError)', () => {
    it('should throw GlobLimitError for patterns exceeding max length', () => {
      const hugePattern = 'a'.repeat(100);
      expect(() => parse(hugePattern, { maxLength: 50 })).toThrowError(GlobLimitError);
      expect(() => parse(hugePattern, { maxLength: 50 })).toThrowError(
        'Glob pattern exceeds maximum allowed length.'
      );
    });

    it('should throw GlobLimitError for deep extglob recursion', () => {
      const deepPattern = '*(a|*(b|*(c|*(d|*(e|*(f|*(g|*(h|*(i|*(j|*(k)))))))))))';
      expect(() => parse(deepPattern, { maxExtglobDepth: 5 })).toThrowError(GlobLimitError);
      expect(() => parse(deepPattern, { maxExtglobDepth: 5 })).toThrowError(
        'Max extglob depth exceeded.'
      );
    });

    it('should throw GlobLimitError for large brace range expansions', () => {
      expect(() => makeRe('file-{1..100000..2}.ts', { maxBraceExpansion: 100 })).toThrowError(
        GlobLimitError
      );
      expect(() => makeRe('file-{1..100000..2}.ts', { maxBraceExpansion: 100 })).toThrowError(
        'Brace range too large.'
      );
    });
  });

  describe('Runtime Type Verification', () => {
    it('should throw TypeError for invalid pattern inputs', () => {
      expect(() => parse(null as any)).toThrowError(TypeError);
      expect(() => parse(undefined as any)).toThrowError(TypeError);
      expect(() => parse(123 as any)).toThrowError(TypeError);
    });
  });
});
