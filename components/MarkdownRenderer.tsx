'use client';

import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ListChecks, 
  Target, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming }) => {
  if (!content) return null;

  // Split lines and parse blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let blockKey = 0;

  // Helper to format inline markdown (bold, italic, code, chips)
  const renderInline = (text: string): React.ReactNode => {
    // Split by inline code first
    const parts: React.ReactNode[] = [];
    const codeRegex = /`([^`]+)`/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    const processTextSegment = (seg: string, segKey: string): React.ReactNode[] => {
      // Process bold **text**
      const segParts: React.ReactNode[] = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let lastBoldIdx = 0;
      let boldMatch: RegExpExecArray | null;

      while ((boldMatch = boldRegex.exec(seg)) !== null) {
        if (boldMatch.index > lastBoldIdx) {
          segParts.push(seg.slice(lastBoldIdx, boldMatch.index));
        }
        
        const boldContent = boldMatch[1];
        // Check if bold content looks like a status tag
        if (boldContent.match(/^(CRITICAL|HIGH|MEDIUM|LOW|PASSED|FAILED|DONE|PENDING|ACTION|P0|P1|P2)/i)) {
          segParts.push(
            <span 
              key={`tag-${segKey}-${boldMatch.index}`} 
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mx-1"
            >
              {boldContent}
            </span>
          );
        } else {
          segParts.push(
            <strong key={`b-${segKey}-${boldMatch.index}`} className="font-semibold text-white">
              {boldContent}
            </strong>
          );
        }
        lastBoldIdx = boldRegex.lastIndex;
      }

      if (lastBoldIdx < seg.length) {
        segParts.push(seg.slice(lastBoldIdx));
      }
      return segParts;
    };

    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(...processTextSegment(text.slice(lastIdx, match.index), `txt-${lastIdx}`));
      }
      parts.push(
        <code 
          key={`code-${match.index}`} 
          className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-indigo-300 border border-white/10"
        >
          {match[1]}
        </code>
      );
      lastIdx = codeRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(...processTextSegment(text.slice(lastIdx), `txt-${lastIdx}`));
    }

    return parts.length > 0 ? parts : text;
  };

  // Heading icon helper based on text
  const getHeadingIcon = (headingText: string, level: number) => {
    const lower = headingText.toLowerCase();
    if (lower.includes('action') || lower.includes('task') || lower.includes('owner')) {
      return <ListChecks className="h-4 w-4 text-emerald-400 shrink-0" />;
    }
    if (lower.includes('decision') || lower.includes('resolved') || lower.includes('conclusion')) {
      return <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />;
    }
    if (lower.includes('risk') || lower.includes('incident') || lower.includes('flag') || lower.includes('root cause') || lower.includes('confidential')) {
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
    }
    if (lower.includes('timeline') || lower.includes('deadline') || lower.includes('schedule')) {
      return <Clock className="h-4 w-4 text-sky-400 shrink-0" />;
    }
    if (lower.includes('objective') || lower.includes('goal') || lower.includes('summary')) {
      return <Target className="h-4 w-4 text-purple-400 shrink-0" />;
    }
    if (level === 1) return <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />;
    if (level === 2) return <ChevronRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />;
    return <Layers className="h-3 w-3 text-white/50 shrink-0" />;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Code blocks (```)
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <div key={`block-${blockKey++}`} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs text-indigo-200">
          <pre>{codeLines.join('\n')}</pre>
        </div>
      );
      continue;
    }

    // 3. Markdown Tables (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        
        // Skip separator row (tableLines[1])
        const bodyRows = tableLines.slice(2).map((row) =>
          row
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={`block-${blockKey++}`} className="overflow-x-auto my-3 rounded-xl border border-white/10 shadow-sm bg-white/[0.01]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white/[0.04] border-b border-white/10 text-white font-semibold">
                <tr>
                  {headerRow.map((col, idx) => (
                    <th key={`th-${idx}`} className="px-3.5 py-2.5 text-[11px] font-semibold text-white/90 border-r border-white/10 last:border-r-0">
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${cIdx}`} className="px-3.5 py-2 text-[11px] text-white/80 border-r border-white/5 last:border-r-0">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 4. Headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const level = trimmed.startsWith('### ') ? 3 : trimmed.startsWith('## ') ? 2 : 1;
      const headingText = trimmed.replace(/^#+\s*/, '');
      const icon = getHeadingIcon(headingText, level);

      if (level === 1) {
        blocks.push(
          <div key={`block-${blockKey++}`} className="pb-2 pt-1 border-b border-white/10 mb-3 mt-4">
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              {icon}
              <span>{renderInline(headingText)}</span>
            </h1>
          </div>
        );
      } else if (level === 2) {
        blocks.push(
          <div key={`block-${blockKey++}`} className="mt-4 mb-2">
            <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              {icon}
              <span>{renderInline(headingText)}</span>
            </h2>
          </div>
        );
      } else {
        blocks.push(
          <div key={`block-${blockKey++}`} className="mt-3 mb-1">
            <h3 className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              {icon}
              <span>{renderInline(headingText)}</span>
            </h3>
          </div>
        );
      }
      i++;
      continue;
    }

    // 5. Blockquotes (> text)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      blocks.push(
        <blockquote key={`block-${blockKey++}`} className="border-l-2 border-indigo-400 bg-white/[0.02] pl-3 py-2 text-xs text-white/80 italic my-2 rounded-r flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <div>{renderInline(quoteText)}</div>
        </blockquote>
      );
      i++;
      continue;
    }

    // 6. Lists (Bullet points, Task list checkboxes, Numbered lists)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const listItems: { text: string; isTask?: boolean; isChecked?: boolean; isOrdered?: boolean; num?: string }[] = [];

      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (curTrim.startsWith('- [ ] ')) {
          listItems.push({ text: curTrim.slice(6), isTask: true, isChecked: false });
        } else if (curTrim.startsWith('- [x] ') || curTrim.startsWith('- [X] ')) {
          listItems.push({ text: curTrim.slice(6), isTask: true, isChecked: true });
        } else if (curTrim.startsWith('- ') || curTrim.startsWith('* ')) {
          listItems.push({ text: curTrim.slice(2) });
        } else if (/^\d+\.\s/.test(curTrim)) {
          const numMatch = curTrim.match(/^(\d+)\.\s(.*)$/);
          if (numMatch) {
            listItems.push({ text: numMatch[2], isOrdered: true, num: numMatch[1] });
          } else {
            break;
          }
        } else {
          break;
        }
        i++;
      }

      blocks.push(
        <div key={`block-${blockKey++}`} className="space-y-1.5 my-2 pl-0.5">
          {listItems.map((item, lIdx) => {
            if (item.isTask) {
              return (
                <div key={`li-${lIdx}`} className="flex items-start gap-2 text-xs text-white/85 leading-relaxed">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border mt-0.5 shrink-0 ${
                    item.isChecked 
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400' 
                      : 'border-white/20 bg-white/[0.05] text-transparent'
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <span>{renderInline(item.text)}</span>
                </div>
              );
            }
            if (item.isOrdered) {
              return (
                <div key={`li-${lIdx}`} className="flex items-start gap-2 text-xs text-white/85 leading-relaxed">
                  <span className="font-mono text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-400/20 shrink-0">
                    {item.num}
                  </span>
                  <span>{renderInline(item.text)}</span>
                </div>
              );
            }
            return (
              <div key={`li-${lIdx}`} className="flex items-start gap-2 text-xs text-white/85 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>{renderInline(item.text)}</span>
              </div>
            );
          })}
        </div>
      );
      continue;
    }

    // 7. Regular paragraph
    blocks.push(
      <p key={`block-${blockKey++}`} className="text-xs text-white/80 leading-relaxed my-1.5">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-1">
      {blocks}
      {isStreaming && (
        <span className="inline-block h-4 w-2 ml-1 bg-indigo-400 animate-pulse align-middle" />
      )}
    </div>
  );
};
