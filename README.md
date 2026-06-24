<h1 align="center">
  <sup>@se-oss/glob</sup>
  <br>
  <a href="https://github.com/shahradelahi/ts-glob/actions/workflows/ci.yml"><img src="https://github.com/shahradelahi/ts-glob/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@se-oss/glob"><img src="https://img.shields.io/npm/v/@se-oss/glob.svg" alt="NPM Version"></a>
  <a href="/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat" alt="MIT License"></a>
  <a href="https://bundlephobia.com/package/@se-oss/glob"><img src="https://img.shields.io/bundlephobia/minzip/@se-oss/glob" alt="npm bundle size"></a>
  <a href="https://packagephobia.com/result?p=@se-oss/glob"><img src="https://packagephobia.com/badge?p=@se-oss/glob" alt="Install Size"></a>
</h1>

_@se-oss/glob_ compiles glob patterns into highly optimized regular expressions to deliver a blazing fast, compiler-grade matching engine with strict syntax checking.

---

- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm install @se-oss/glob
```

<details>
<summary>Install using your favorite package manager</summary>

**pnpm**

```bash
pnpm install @se-oss/glob
```

**yarn**

```bash
yarn add @se-oss/glob
```

</details>

## 📖 Usage

### Basic Usage

Check if an input string matches a pattern or multiple patterns.

```ts
import { isMatch } from '@se-oss/glob';

isMatch('foo/bar.ts', 'foo/**/*.ts'); // true
isMatch('foo/b.ts', ['foo/**/*.ts', '!foo/b.ts']); // false
```

### Compiler Matcher

Compile a glob pattern once into a highly optimized matcher function for repeated matches.

```ts
import { compile } from '@se-oss/glob';

const isTs = compile('foo/*.ts');

isTs('foo/bar.ts'); // true
isTs('foo/bar/baz.ts'); // false
```

### Regular Expression

Compile a glob pattern directly into a JavaScript `RegExp` object.

```ts
import { makeRe } from '@se-oss/glob';

const regex = makeRe('foo/*.ts');

regex.test('foo/bar.ts'); // true
```

### Scanning

Extract the leading static path (base) and determine if a pattern contains dynamic glob features.

```ts
import { scan } from '@se-oss/glob';

scan('foo/bar/*.js');
// { base: 'foo/bar', isDynamic: true, pattern: 'foo/bar/*.js' }
```

### Partial Matching

Check if a path is a partial match for a glob pattern. Highly useful for file watchers and tree traversals to skip scanning directories early.

```ts
import { isPartialMatch } from '@se-oss/glob';

isPartialMatch('src/app', 'src/**/*.ts'); // true
isPartialMatch('dist', 'src/**/*.ts'); // false
```

### AST Parsing

Parse a glob pattern safely to validate or inspect its Abstract Syntax Tree (AST).

```ts
import { safeParse } from '@se-oss/glob';

const result = safeParse('src/**/*.ts');
if (result.success) {
  console.log(result.data); // AST Node
}
```

## 📚 Documentation

For all configuration options, please see [the API docs](https://www.jsdocs.io/package/@se-oss/glob).

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/ts-glob).

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/ts-glob/graphs/contributors).
