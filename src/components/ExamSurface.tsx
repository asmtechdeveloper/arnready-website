'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { studySurface as copy } from '@/lib/copy';
import { useEntitlement } from '@/lib/entitlementStore';
import { fetchExamQuestions } from '@/lib/questionDelivery';
import type { Question } from '@/lib/quizEngine';
import { ExamPlayer } from '@/components/ExamPlayer';
import { StudySurface, type DeliveryResult } from '@/components/StudySurface';

/**
 * `/app/exam` client surface (M5 S3, player mounted in S5). Wires
 * params → auth → entitlement → `questionDelivery`, then mounts
 * `<ExamPlayer>` in the slot it resolves to — no gate/nudge decision or
 * question rendering happens in this file itself; that is `ExamPlayer`'s
 * scope (D8).
 */
export function ExamSurface() {
  const searchParams = useSearchParams();
  const chapterParam = searchParams.get('chapter');
  const isPaid = useEntitlement((s) => s.isPaid);

  const load = useCallback(
    async (chapter: number): Promise<DeliveryResult<Question[]>> => {
      const result = await fetchExamQuestions(chapter, isPaid);
      return result.status === 'ok' ? { status: 'ok', data: result.questions } : result;
    },
    [isPaid],
  );

  return (
    <StudySurface chapterParam={chapterParam} loadingLabel={copy.loading.exam} load={load}>
      {({ chapter, data }) => (
        <div data-testid="exam-player-slot">
          <ExamPlayer chapter={chapter} questions={data} isPaid={isPaid} />
          <span
            hidden
            data-testid="exam-delivery-state"
            data-chapter={chapter}
            data-question-count={data.length}
          />
        </div>
      )}
    </StudySurface>
  );
}
