import { format, Options } from "prettier";

/**
 * format text with prettier
 *
 * @param source - text to transform
 * @param options - additional options passed to prettier
 */
export function formatText(source: string, options?: Options) {
  return format(source, {
    parser: "typescript",
    ...options,
  });
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
