import type { ReactNode } from 'react';
import Link from 'next/link';

export type LinkifyRule = { label: string; href: string };

/**
 * Splits plain copy text around known phrases and wraps each in a <Link>,
 * so copy strings stay plain text (the voice pass edits src/lib/copy.ts
 * only) while pages still render real, clickable links.
 */
export function linkify(text: string, rules: LinkifyRule[]): ReactNode {
  if (rules.length === 0) return text;
  let chunks: ReactNode[] = [text];
  for (const rule of rules) {
    chunks = chunks.flatMap((chunk) => {
      if (typeof chunk !== 'string' || !chunk.includes(rule.label)) return [chunk];
      const [before, after] = chunk.split(rule.label);
      return [
        before,
        <Link key={rule.href} href={rule.href} className="text-purple hover:underline">
          {rule.label}
        </Link>,
        after,
      ];
    });
  }
  return chunks;
}
