/**
 * AlgoFlow Safe Markdown-to-HTML Renderer Utility
 * Converts markdown headings, code blocks, bold, italics, lists, blockquotes,
 * and links into styled HTML compatible with the AlgoFlow theme.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  // 1. Extract and preserve fenced code blocks ```lang ... ```
  const codeBlocks: string[] = [];
  let html = markdown.replace(/```([a-zA-Z0-9_#-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escapedCode = escapeHtml(code.trim());
    const langLabel = lang
      ? `<div class="px-3.5 py-1.5 bg-[var(--obsidian)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--verdigris)] uppercase tracking-wider flex items-center justify-between font-semibold"><span>${escapeHtml(
          lang
        )}</span><span class="text-[10px] text-[var(--text-3)] lowercase font-normal">source code</span></div>`
      : '';
    const block = `<div class="my-4 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)] overflow-hidden shadow-sm">${langLabel}<pre class="p-4 text-xs font-mono text-[var(--bone)] overflow-x-auto leading-relaxed"><code>${escapedCode}</code></pre></div>`;
    codeBlocks.push(block);
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });

  // 2. Extract and preserve inline code `code`
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const escapedCode = escapeHtml(code);
    const block = `<code class="px-1.5 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)] text-xs font-mono text-[var(--verdigris)] font-medium">${escapedCode}</code>`;
    inlineCodes.push(block);
    return `<!--INLINE_CODE_${inlineCodes.length - 1}-->`;
  });

  // 3. Process line-by-line block structures
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let inNumberedList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Placeholder check
    if (line.trim().startsWith('<!--CODE_BLOCK_')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push(
        `<h4 class="text-sm font-bold text-[var(--bone)] mt-5 mb-2 font-mono uppercase tracking-wide">${line.slice(
          5
        )}</h4>`
      );
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push(
        `<h3 class="text-base font-bold text-[var(--bone)] mt-6 mb-2.5 flex items-center gap-2 border-b border-[var(--border)] pb-1.5"><span class="w-1.5 h-4 bg-[var(--verdigris)] rounded-full"></span>${line.slice(
          4
        )}</h3>`
      );
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push(
        `<h2 class="text-lg font-bold text-[var(--bone)] mt-7 mb-3 pb-2 border-b border-[var(--border-strong)] text-[var(--verdigris)] flex items-center gap-2 font-mono">${line.slice(
          3
        )}</h2>`
      );
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push(
        `<h1 class="text-xl font-bold text-[var(--bone)] mt-8 mb-4 tracking-tight">${line.slice(
          2
        )}</h1>`
      );
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      processedLines.push('<hr class="my-6 border-[var(--border)]" />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (!inBlockquote) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        processedLines.push(
          '<blockquote class="p-3.5 my-3 border-l-2 border-[var(--verdigris)] bg-[var(--ash)] rounded-r-[var(--r-sm)] text-xs text-[var(--text-2)] italic space-y-1">'
        );
        inBlockquote = true;
      }
      processedLines.push(`<p>${line.slice(2)}</p>`);
      continue;
    } else if (inBlockquote) {
      processedLines.push('</blockquote>');
      inBlockquote = false;
    }

    // Unordered List (- item or * item)
    if (/^[-*+]\s+/.test(line.trim())) {
      if (!inList) {
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        processedLines.push(
          '<ul class="my-2.5 space-y-1.5 text-xs text-[var(--text-2)] pl-5 list-disc">'
        );
        inList = true;
      }
      const itemText = line.trim().replace(/^[-*+]\s+/, '');
      processedLines.push(`<li class="leading-relaxed">${itemText}</li>`);
      continue;
    } else if (inList) {
      processedLines.push('</ul>');
      inList = false;
    }

    // Numbered List (1. item)
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!inNumberedList) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(
          '<ol class="my-2.5 space-y-1.5 text-xs text-[var(--text-2)] pl-5 list-decimal font-mono">'
        );
        inNumberedList = true;
      }
      const itemText = line.trim().replace(/^\d+\.\s+/, '');
      processedLines.push(
        `<li class="leading-relaxed"><span class="font-sans">${itemText}</span></li>`
      );
      continue;
    } else if (inNumberedList) {
      processedLines.push('</ol>');
      inNumberedList = false;
    }

    // Blank line
    if (!line.trim()) {
      continue;
    }

    // Regular paragraph
    processedLines.push(
      `<p class="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed my-2">${line}</p>`
    );
  }

  if (inList) processedLines.push('</ul>');
  if (inNumberedList) processedLines.push('</ol>');
  if (inBlockquote) processedLines.push('</blockquote>');

  let result = processedLines.join('\n');

  // Inline formatting
  // Bold **text**
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-bold text-[var(--bone)]">$1</strong>'
  );
  // Italic *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-[var(--bone)]">$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em class="italic text-[var(--bone)]">$1</em>');
  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--verdigris)] hover:underline font-medium">$1</a>'
  );

  // Restore inline codes
  inlineCodes.forEach((codeHtml, idx) => {
    result = result.replace(`<!--INLINE_CODE_${idx}-->`, codeHtml);
  });

  // Restore code blocks
  codeBlocks.forEach((blockHtml, idx) => {
    result = result.replace(`<!--CODE_BLOCK_${idx}-->`, blockHtml);
  });

  return result;
}
