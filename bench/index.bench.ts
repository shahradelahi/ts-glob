import { compile, makeRe } from '@se-oss/glob';
import micromatch from 'micromatch';
import { minimatch, Minimatch } from 'minimatch';
import picomatch from 'picomatch';
import { bench, describe } from 'vitest';

// --- Benchmark Datasets ---
const simplePattern = 'src/*.ts';
const globstarPattern = 'src/**/*.ts';
const bracePattern = 'src/file-{1..100}.ts';

const simplePaths = Array.from({ length: 1000 }, (_, i) =>
  i % 2 === 0 ? `src/file-${i}.ts` : `src/file-${i}.js`
);

const nestedPaths = Array.from({ length: 1000 }, (_, i) =>
  i % 2 === 0 ? `src/a/b/c/d/file-${i}.ts` : `src/a/b/c/d/file-${i}.js`
);

// --- 1. COMPILATION SPEED BENCHMARKS ---
describe('Compilation: Simple Glob (src/*.ts)', () => {
  bench('picomatch', () => {
    picomatch(simplePattern);
  });

  bench('@se-oss/glob', () => {
    compile(simplePattern);
  });

  bench('minimatch', () => {
    new Minimatch(simplePattern);
  });
});

describe('Compilation: Globstar (src/**/*.ts)', () => {
  bench('picomatch', () => {
    picomatch(globstarPattern);
  });

  bench('@se-oss/glob', () => {
    compile(globstarPattern);
  });

  bench('minimatch', () => {
    new Minimatch(globstarPattern);
  });
});

describe('Compilation: Braces (src/file-{1..100}.ts)', () => {
  bench('picomatch', () => {
    picomatch(bracePattern);
  });

  bench('@se-oss/glob', () => {
    compile(bracePattern);
  });

  bench('minimatch', () => {
    new Minimatch(bracePattern);
  });
});

// --- 2. MATCHING SPEED BENCHMARKS (PRE-COMPILED) ---
const picoSimple = picomatch(simplePattern);
const seSimple = compile(simplePattern);
const miniSimple = new Minimatch(simplePattern);

describe('Matching: Simple Glob over 1,000 paths', () => {
  bench('picomatch', () => {
    for (let i = 0; i < simplePaths.length; i++) {
      picoSimple(simplePaths[i]!);
    }
  });

  bench('@se-oss/glob', () => {
    for (let i = 0; i < simplePaths.length; i++) {
      seSimple(simplePaths[i]!);
    }
  });

  bench('minimatch', () => {
    for (let i = 0; i < simplePaths.length; i++) {
      miniSimple.match(simplePaths[i]!);
    }
  });
});

const picoGlobstar = picomatch(globstarPattern);
const seGlobstar = compile(globstarPattern);
const miniGlobstar = new Minimatch(globstarPattern);

describe('Matching: Globstar over 1,000 nested paths', () => {
  bench('picomatch', () => {
    for (let i = 0; i < nestedPaths.length; i++) {
      picoGlobstar(nestedPaths[i]!);
    }
  });

  bench('@se-oss/glob', () => {
    for (let i = 0; i < nestedPaths.length; i++) {
      seGlobstar(nestedPaths[i]!);
    }
  });

  bench('minimatch', () => {
    for (let i = 0; i < nestedPaths.length; i++) {
      miniGlobstar.match(nestedPaths[i]!);
    }
  });
});
