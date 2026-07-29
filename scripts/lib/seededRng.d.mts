/** Deterministic mulberry32 rng. Same seed → same sequence in [0, 1). */
export declare function makeSeededRng(seed: number): () => number;
