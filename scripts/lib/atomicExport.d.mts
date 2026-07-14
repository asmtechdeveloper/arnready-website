export declare const EXPORT_BASENAME: string;
export declare function stageGeneration(exportDir: string): {
  slot: string;
  genDir: string;
  contentDir: string;
  leakDir: string;
};
export declare function validateStagedGeneration(contentDir: string, leakDir: string): void;
export declare function publishGeneration(root: string, exportDir: string, slot: string): void;
