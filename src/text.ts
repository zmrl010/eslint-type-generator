import { format, Options } from 'prettier';

export const prettierConfig = {
  singleQuote: true,
} satisfies Options;

const DEFAULT_OPTIONS = {
  ...prettierConfig,
  parser: 'typescript',
} satisfies Options;

/**
 * format text with prettier
 * @param source - text to transform
 * @param options - additional options to be merged with
 * default config before formatting text
 *
 * default parser is `typescript`
 */
export function formatText(source: string, options?: Options) {
  return format(source, {
    ...DEFAULT_OPTIONS,
    ...options,
  });
}

export function joinLines(...lines: string[]) {
  return lines.join('\n');
}

/**
 * transform casing of text to PascalCase
 */
export function toPascalCase(name: string): string {
  const camel = name
    .replace(/(-\w)/gu, (m) => m[1].toUpperCase())
    .replace(/^(@\w)/u, (m) => m[1].toUpperCase())
    .replace(/\/./u, (s) => s[1].toUpperCase());
  const pascal = camel[0].toUpperCase() + camel.slice(1);

  return pascal;
}

function escapeDocComment(val: string): string {
  return val.replace('*/', '*\\/');
}

/**
 * Generate a js doc comment string using input lines
 */
export function createDoc(...lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }

  // prettier-ignore
  return joinLines(
    `/**`,
    ...lines.map((line) => 
    ` * ${escapeDocComment(line)}`),
    ` */`
  );
}
