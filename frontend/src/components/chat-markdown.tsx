'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Lightweight markdown for chat bubbles — headings, lists, bold/italic/code.
 * No dependency on react-markdown; safe for untrusted short assistant text.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on **bold**, *italic*, `code` (non-greedy, non-overlapping pass)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className='font-semibold text-foreground'>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (
      part.startsWith('*') &&
      part.endsWith('*') &&
      part.length > 2 &&
      !part.startsWith('**')
    ) {
      return (
        <em key={key} className='italic'>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={key}
          className='rounded bg-foreground/8 px-1 py-0.5 font-mono text-[0.85em]'
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; text: string }
  | { type: 'spacer' };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push({ type: 'spacer' });
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim()
      });
      i += 1;
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Merge consecutive plain lines into one paragraph
    const paras: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (/^(#{1,3})\s+/.test(next)) break;
      if (/^[-*•]\s+/.test(next)) break;
      if (/^\d+[.)]\s+/.test(next)) break;
      paras.push(next);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paras.join(' ') });
  }

  return blocks;
}

export function ChatMarkdown({
  content,
  className,
  tone = 'default'
}: {
  content: string;
  className?: string;
  /** Invert strong/code contrast for dark user bubbles */
  tone?: 'default' | 'onDark';
}) {
  const blocks = parseBlocks(content);
  const strongClass =
    tone === 'onDark' ? 'font-semibold text-background' : undefined;

  return (
    <div
      className={cn(
        'space-y-2 break-words text-sm leading-relaxed',
        className
      )}
    >
      {blocks.map((block, idx) => {
        const key = `b-${idx}`;
        if (block.type === 'spacer') {
          return <div key={key} className='h-1' />;
        }
        if (block.type === 'heading') {
          const Tag = (
            block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5'
          ) as 'h3' | 'h4' | 'h5';
          return (
            <Tag
              key={key}
              className={cn(
                'font-display font-extrabold tracking-tight text-foreground',
                block.level === 1 && 'text-base',
                block.level === 2 && 'text-[0.95rem]',
                block.level === 3 && 'text-sm',
                tone === 'onDark' && 'text-background'
              )}
            >
              {renderInline(block.text, key)}
            </Tag>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={key} className='space-y-1.5 pl-0'>
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`} className='flex gap-2.5'>
                  <span
                    className={cn(
                      'mt-[0.45rem] size-1.5 shrink-0 rounded-full',
                      tone === 'onDark' ? 'bg-background/70' : 'bg-brand'
                    )}
                    aria-hidden
                  />
                  <span className='min-w-0 flex-1'>
                    {renderInline(item, `${key}-${j}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={key} className='space-y-1.5 pl-0'>
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`} className='flex gap-2.5'>
                  <span
                    className={cn(
                      'mt-px w-4 shrink-0 font-mono text-[11px] font-semibold tabular-nums',
                      tone === 'onDark'
                        ? 'text-background/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {j + 1}.
                  </span>
                  <span className='min-w-0 flex-1'>
                    {renderInline(item, `${key}-${j}`)}
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p
            key={key}
            className={cn(strongClass && '[&_strong]:text-background')}
          >
            {renderInline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
