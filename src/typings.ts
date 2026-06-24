export interface GlobOptions {
  /**
   * Disable compilation caching
   * @default false
   */
  nocache?: boolean;

  /**
   * Match hidden files (files starting with a dot)
   * @default false
   */
  dot?: boolean;

  /**
   * Case-insensitive matching
   * @default false
   */
  nocase?: boolean;

  /**
   * Disable extended glob syntax (e.g., @(...), !(...))
   * @default false
   */
  noextglob?: boolean;

  /**
   * Disable brace expansion (e.g., {a,b,c})
   * @default false
   */
  nobrace?: boolean;

  /**
   * Disable globstar (**) directory matching, treating it as a double asterisk
   * @default false
   */
  noglobstar?: boolean;

  /**
   * Treat backslashes as path separators on Windows and normalize them to forward slashes.
   * If true, backslashes are normalized; if false, backslashes are treated as literal escape characters.
   * @default true
   */
  windows?: boolean;

  /**
   * Keep escape characters in the compiled regex
   * @default false
   */
  unescape?: boolean;

  /**
   * Restrict matching to files only (not directories, when path has trailing slash)
   * @default false
   */
  strictSlashes?: boolean;

  /**
   * Allow glob patterns without slashes to match a file path based on its basename.
   * @default false
   */
  basename?: boolean;

  /**
   * Enable strict syntax checking (throws on unbalanced braces, brackets, or extglobs)
   * @default false
   */
  strict?: boolean;

  /**
   * Maximum allowed length for glob patterns.
   * @default 65536
   */
  maxLength?: number;

  /**
   * Maximum allowed recursion depth for extglobs.
   * @default 10
   */
  maxExtglobDepth?: number;

  /**
   * Maximum allowed brace range expansion size.
   * @default 10000
   */
  maxBraceExpansion?: number;
}

export type TokenType =
  | 'TEXT'
  | 'STAR'
  | 'GLOBSTAR'
  | 'QUESTION'
  | 'SLASH'
  | 'BRACE_OPEN'
  | 'BRACE_CLOSE'
  | 'COMMA'
  | 'BRACKET_OPEN'
  | 'BRACKET_CLOSE'
  | 'EXTGLOB_OPEN'
  | 'PAREN_OPEN'
  | 'PAREN_CLOSE'
  | 'PIPE'
  | 'EXCLAMATION'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export type NodeType =
  | 'Root'
  | 'Text'
  | 'Star'
  | 'Globstar'
  | 'Question'
  | 'Slash'
  | 'Brace'
  | 'BraceExpression'
  | 'Bracket'
  | 'Extglob'
  | 'Paren'
  | 'Pipe'
  | 'Negation';

export interface ASTNode {
  type: NodeType;
  value: string;
  children?: ASTNode[];
  // For extglobs, e.g. @, !, *, +, ?
  modifier?: '@' | '!' | '*' | '+' | '?';
  // For bracket expressions like [^a-z]
  negated?: boolean;
}

export interface ScanResult {
  base: string;
  isDynamic: boolean;
  pattern: string;
}

export type MatcherFunction = (input: string) => boolean;
