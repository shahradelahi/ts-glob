import { compileNumericRange, expandRange } from '@se-oss/braces';
import { ASTNode, GlobLimitError } from '@se-oss/glob-parser';

import { GlobOptions } from './typings';
import { compileBracketValue, escapeRegex } from './utils';

export class Compiler {
  #options: GlobOptions;

  constructor(options: GlobOptions = {}) {
    this.#options = options;
  }

  compile(node: ASTNode): RegExp {
    let source = this.#compileNode(node);

    // Force exact match anchoring
    source = '^' + source + '$';

    const flags = this.#options.nocase ? 'i' : '';
    return new RegExp(source, flags);
  }

  #compileNode(node: ASTNode): string {
    if (node.type === 'Root' && node.children) {
      const segments = this.#splitIntoSegments(node.children);
      return this.#compileSegments(segments);
    }
    return this.#compileSingleNode(node);
  }

  #splitIntoSegments(nodes: ASTNode[]): ASTNode[][] {
    const segments: ASTNode[][] = [];
    let currentSegment: ASTNode[] = [];

    for (const node of nodes) {
      if (node.type === 'Slash') {
        segments.push(currentSegment);
        currentSegment = [];
      } else {
        currentSegment.push(node);
      }
    }
    segments.push(currentSegment);
    return segments;
  }

  #compileSegments(segments: ASTNode[][]): string {
    let result = '';
    let prevWasMiddleGlobstar = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const isFirst = i === 0;
      const isLast = i === segments.length - 1;

      const isMiddleGlobstar = seg.length === 1 && seg[0]!.type === 'Globstar' && !isLast;
      const compiledSeg = this.#compileSegment(seg, isFirst, isLast);

      if (isFirst) {
        result += compiledSeg;
      } else {
        if (prevWasMiddleGlobstar) {
          result += compiledSeg;
        } else {
          result += '/' + compiledSeg;
        }
      }

      prevWasMiddleGlobstar = isMiddleGlobstar;
    }

    return result;
  }

  #compileSegment(nodes: ASTNode[], isFirstSegment: boolean, isLastSegment: boolean): string {
    if (nodes.length === 0) return '';

    // Special single globstar compilation
    if (nodes.length === 1 && nodes[0]!.type === 'Globstar') {
      if (isFirstSegment && isLastSegment) {
        return '.*';
      }
      if (isLastSegment) {
        return '.*';
      }
      const dotRestriction = this.#options.dot ? '' : '(?!\\.)';
      return `(?:${dotRestriction}[^/]+/)*`;
    }

    let segmentRegex = '';

    if (!this.#options.dot) {
      const firstNode = nodes[0]!;
      if (
        firstNode.type === 'Star' ||
        firstNode.type === 'Question' ||
        firstNode.type === 'Extglob' ||
        firstNode.type === 'Brace' ||
        firstNode.type === 'Bracket'
      ) {
        segmentRegex += '(?!\\.)';
      }
    }

    for (let idx = 0; idx < nodes.length; idx++) {
      const node = nodes[idx]!;
      if (node.type === 'Extglob' && node.modifier === '!') {
        const compiledBranches = node.children
          ? node.children.map((child) => this.#compileNode(child))
          : [];
        const choices = compiledBranches.join('|');

        let restRegex = '';
        for (let j = idx + 1; j < nodes.length; j++) {
          restRegex += this.#compileSingleNode(nodes[j]!);
        }

        const anchor = restRegex ? restRegex : '(?:/|$)';
        segmentRegex += `(?!(?:${choices})${anchor})[^/]*`;
      } else {
        segmentRegex += this.#compileSingleNode(node);
      }
    }

    return segmentRegex;
  }

  #compileSingleNode(node: ASTNode): string {
    switch (node.type) {
      case 'Text':
        return escapeRegex(node.value);
      case 'Star':
      case 'Globstar':
        return '[^/]*';
      case 'Question':
        return '[^/]';
      case 'Bracket':
        return (node.negated ? '[^' : '[') + compileBracketValue(node.value) + ']';
      case 'Brace':
        if (node.children) {
          const compiledBranches = node.children.map((child) => this.#compileNode(child));
          return `(?:${compiledBranches.join('|')})`;
        } else {
          const parts = node.value.split('..');
          const isNumeric =
            parts.length >= 2 && /^-?\d+$/.test(parts[0]!) && /^-?\d+$/.test(parts[1]!);
          const hasPadding = parts[0]!.startsWith('0') && parts[0]!.length > 1;

          if (isNumeric && !hasPadding && !parts[2]) {
            const start = parseInt(parts[0]!, 10);
            const end = parseInt(parts[1]!, 10);
            return `(?:${compileNumericRange(start, end)})`;
          } else {
            try {
              const expanded = expandRange(node.value, this.#options.maxBraceExpansion);
              const escaped = expanded.map((val) => escapeRegex(val));
              return `(?:${escaped.join('|')})`;
            } catch (err) {
              if (err instanceof Error && err.name === 'BraceLimitError') {
                throw new GlobLimitError('Brace range too large.');
              }
              throw err;
            }
          }
        }
      case 'Extglob': {
        const compiledBranches = node.children
          ? node.children.map((child) => this.#compileNode(child))
          : [];
        const choices = compiledBranches.join('|');
        switch (node.modifier) {
          case '?':
            return `(?:${choices})?`;
          case '*':
            return `(?:${choices})*`;
          case '+':
            return `(?:${choices})+`;
          case '@':
            return `(?:${choices})`;
          case '!':
            return `(?!(?:${choices})(?:/|$))[^/]*`;
          default:
            return '';
        }
      }
      default:
        return '';
    }
  }
}
