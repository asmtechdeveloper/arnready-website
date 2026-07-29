'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { studySurface as copy } from '@/lib/copy';
import { useEntitlement } from '@/lib/entitlementStore';
import { fetchPracticeQuestions } from '@/lib/questionDelivery';
import type { Question } from '@/lib/quizEngine';
import { PracticePlayer } from '@/components/PracticePlayer';
import { StudySurface, type DeliveryResult } from '@/components/StudySurface';

/** `?q=` is 1-based; any missing or invalid value defaults to 1 — never 0,
 * never negative, never NaN. Read here so it exists for S4's player; S4
 * validates it against the actual served set, not this route. */
function parseStartAt(raw: string | null): number {
  if (raw == null) return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * `/app/practice` client surface (M5 S3, player mounted in S4). Wires
 * params → auth → entitlement → `questionDelivery`, then mounts
 * `<PracticePlayer>` in the slot it resolves to — no gate/nudge decision or
 * question rendering happens in this file itself; that is `PracticePlayer`'s
 * scope (D7).
 */
export function PracticeSurface() {
  const searchParams = useSearchParams();
  const chapterParam = searchParams.get('chapter');
  const startAt = parseStartAt(searchParams.get('q'));
  const isPaid = useEntitlement((s) => s.isPaid);

  const load = useCallback(
    async (chapter: number): Promise<DeliveryResult<Question[]>> => {
      const result = await fetchPracticeQuestions(chapter, isPaid);
      return result.status === 'ok' ? { status: 'ok', data: result.questions } : result;
    },
    [isPaid],
  );

  return (
    <StudySurface chapterParam={chapterParam} loadingLabel={copy.loading.practice} load={load}>
      {({ chapter, data }) => (
        <div data-testid="practice-player-slot">
          <PracticePlayer chapter={chapter} questions={data} startAt={startAt} isPaid={isPaid} />
        </div>
      )}
    </StudySurface>
  );
}
