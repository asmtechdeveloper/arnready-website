export declare const EXPORT_BASENAME: string;
export declare function ensureReaderLayout(root: string, exportDir: string): void;
export declare function stageGeneration(exportDir: string): {
  slot: string;
  genDir: string;
  contentDir: string;
  leakDir: string;
};
export declare function validateStagedGeneration(contentDir: string, leakDir: string): void;
export declare function publishGeneration(exportDir: string, slot: string): void;
