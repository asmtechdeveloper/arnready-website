import type { Segment, TeachingBlock } from '@/lib/teaching';

function Inline({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        const key = `${i}-${seg.text.slice(0, 12)}`;
        if (seg.emphasis === 'bold') return <strong key={key}>{seg.text}</strong>;
        if (seg.emphasis === 'italic') return <em key={key}>{seg.text}</em>;
        if (seg.emphasis === 'boldItalic') {
          return (
            <strong key={key}>
              <em>{seg.text}</em>
            </strong>
          );
        }
        return <span key={key}>{seg.text}</span>;
      })}
    </>
  );
}

/** Renders normalized teaching blocks (paragraph/heading/bullets) — the one shared renderer for hub + spoke teaching prose. */
export function TeachingBlocks({ blocks }: { blocks: TeachingBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <h2 key={i} className="text-lg font-bold text-ink">
              <Inline segments={block.segments} />
            </h2>
          );
        }
        if (block.type === 'bullets') {
          return (
            <ul key={i} className="list-disc space-y-2 pl-5 text-[0.95rem] leading-7 text-muted">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline segments={item.segments} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[0.95rem] leading-7 text-muted">
            <Inline segments={block.segments} />
          </p>
        );
      })}
    </div>
  );
}
