export type Scanner = { index: Map<number, string[]>; k: number; power: number; empty: boolean };
export declare function buildScanner(patterns: string[]): Scanner;
export declare function findMatches(scanner: Scanner, text: string): string[];
export declare function hasMatch(scanner: Scanner, text: string): boolean;
