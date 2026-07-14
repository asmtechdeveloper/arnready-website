export declare function freshDir(dir: string): string;
export declare function validateStagedExport(contentStage: string, leakStage: string): void;
export declare function commitStaging(pairs: { staging: string; final: string }[]): void;
