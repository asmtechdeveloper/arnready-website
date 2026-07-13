import type { ReactNode } from 'react';
import Link from 'next/link';

export type LinkifyRule = { label: string; href: string };

/**
 * Splits plain copy text around known phrases and wraps EVERY occurrence of
 * each phrase in a <Link>, so copy strings stay plain text (the voice pass
 * edits src/lib/copy.ts only) while pages still render real, clickable
 * links. Preserves all text — including any text after a phrase's second
 * or later occurrence.
 */
export function linkify(text: string, rules: LinkifyRule[]): ReactNode {
  if (rules.length === 0) return text;
  let chunks: ReactNode[] = [text];
  for (const rule of rules) {
    chunks = chunks.flatMap((chunk, chunkIndex) => {
      if (typeof chunk !== 'string' || !chunk.includes(rule.label)) return [chunk];
      const parts = chunk.split(rule.label);
      const result: ReactNode[] = [];
      parts.forEach((part, i) => {
        if (part) result.push(part);
        if (i < parts.length - 1) {
          result.push(
            <Link key={`${rule.href}-${chunkIndex}-${i}`} href={rule.href} className="text-purple hover:underline">
              {rule.label}
            </Link>,
          );
        }
      });
      return result;
    });
  }
  return chunks;
}
