export declare const SAMPLER_SIZE: number;
export declare function computePublicBlobs(rawByChapter: Map<number, unknown[]>): string[];
export declare function partitionFreeFieldFps(
  freeQuestionsByChapter: Map<number, { question?: unknown; options?: unknown; explanation?: unknown }[]>,
  publicBlobs: string[],
): { all: string[]; scannable: string[]; excludedCount: number };
