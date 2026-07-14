export type Emphasis = 'regular' | 'bold' | 'italic' | 'boldItalic';
export type Segment = { text: string; emphasis: Emphasis };
export type ParagraphBlock = { type: 'paragraph'; segments: Segment[] };
export type HeadingBlock = { type: 'heading'; segments: Segment[] };
export type BulletsBlock = { type: 'bullets'; items: { segments: Segment[] }[] };
export type TeachingBlock = ParagraphBlock | HeadingBlock | BulletsBlock;

export type ChapterTeaching = {
  chapter: number;
  contentVersion: string | null;
  blocks: TeachingBlock[];
};

export type SubtopicTeaching = {
  subtopicSlug: string;
  subtopic: string;
  contentVersion: string | null;
  blocks: TeachingBlock[];
};

export declare function normalizeChapterTeaching(rawDocs: unknown, chapterNumber: number): ChapterTeaching | null;
export declare function normalizeSubtopicTeaching(rawDocs: unknown, chapterNumber: number): Record<string, SubtopicTeaching>;
